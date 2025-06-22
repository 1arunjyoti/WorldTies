import React, { useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import type { Feature } from 'geojson';

interface ExportControlsProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  selectedCountry: Feature | null;
  relationshipData: any;
  countries: Feature[];
}

const ExportControls: React.FC<ExportControlsProps> = ({
  svgRef,
  selectedCountry,
  relationshipData,
  countries
}) => {
  const exportContainerRef = useRef<HTMLDivElement>(null);

  const exportAsPNG = async () => {
    if (!svgRef.current) return;
    
    // Create a clone of the SVG element to avoid modifying the original
    const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
    
    // Get the bounding box of the SVG to get its actual dimensions
    const bbox = svgRef.current.getBBox();
    const width = bbox.width + bbox.x * 2; // Add padding
    const height = bbox.height + bbox.y * 2;
    
    // Set explicit width and height on the clone
    svgClone.setAttribute('width', width.toString());
    svgClone.setAttribute('height', height.toString());
    svgClone.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${width} ${height}`);
    
    // Serialize the modified SVG
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    // Set scale factor for higher resolution (2x for retina/HD displays)
    const scale = 2;
    
    img.onload = () => {
      // Set canvas dimensions with the correct aspect ratio
      canvas.width = width * scale;
      canvas.height = height * scale;
      
      // Scale and draw the image
      ctx?.scale(scale, scale);
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Convert to blob with maximum quality
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `worldties-${new Date().toISOString().split('T')[0]}.png`);
        }
        // Clean up the object URL
        URL.revokeObjectURL(img.src);
      }, 'image/png', 1.0);
    };
    
    // Set image source with proper encoding
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.src = url;
  };

  const exportAsSVG = () => {
    if (!svgRef.current) return;
    
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgRef.current);
    
    // Add namespaces if needed
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
      source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }
    
    // Add XML declaration
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
    
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    saveAs(blob, `worldties-${new Date().toISOString().split('T')[0]}.svg`);
  };

  const exportAsCSV = () => {
    if (!selectedCountry) {
      // Export all relationships
      const allRelationships: any[] = [];
      
      Object.entries(relationshipData).forEach(([countryCode, countryData]: [string, any]) => {
        const country = countries.find(c => getCountryCode(c) === countryCode);
        const countryName = country?.properties?.name || countryCode;
        
        Object.entries(countryData.relations).forEach(([partnerCode, strength]: [string, any]) => {
          const partner = countries.find(c => getCountryCode(c) === partnerCode);
          const partnerName = partner?.properties?.name || partnerCode;
          
          allRelationships.push({
            'Source Country': `"${countryName}"`,
            'Target Country': `"${partnerName}"`,
            'Relationship Strength': strength
          });
        });
      });
      
      const headers = Object.keys(allRelationships[0] || {});
      const csvContent = [
        headers.join(','),
        ...allRelationships.map(row => 
          headers.map(header => row[header]).join(',')
        )
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `world-relationships-${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      // Export relationships for selected country
      const countryCode = getCountryCode(selectedCountry);
      const countryRelationships = relationshipData[countryCode]?.relations || {};
      
      const csvContent = [
        'Country,Relationship Strength',
        ...Object.entries(countryRelationships).map(([partnerCode, strength]) => {
          const partner = countries.find(c => getCountryCode(c) === partnerCode);
          const partnerName = partner?.properties?.name || partnerCode;
          return `"${partnerName}",${strength}`;
        })
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const countryName = selectedCountry.properties?.name || 'country';
      saveAs(blob, `${countryName}-relationships-${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  // Helper function to get country code from feature
  const getCountryCode = (feature: Feature): string => {
    return feature.id as string || feature.properties?.iso_a3 || feature.properties?.iso_a2 || '';
  };

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div ref={exportContainerRef} className="w-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between font-bold text-md ${isExpanded ? 'mb-2' : ''} text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-200 transition-colors`}
        aria-expanded={isExpanded}
      >
        <span>Export</span>
        <svg
          className={`w-5 h-5 transform transition-transform ${isExpanded ? '' : 'rotate-180'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="flex flex-col space-y-2">
        <button
          onClick={exportAsPNG}
          className="w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
          title="Export as PNG"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          PNG
        </button>
        <button
          onClick={exportAsSVG}
          className="w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
          title="Export as SVG"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          SVG
        </button>
        <button
          onClick={exportAsCSV}
          className="w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
          title="Export relationships as CSV"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {selectedCountry ? 'Country Data (CSV)' : 'All Data (CSV)'}
        </button>
        </div>
      )}
    </div>
  );
};

export default ExportControls;
