// src/components/ExportControls.tsx

import React, { useState } from 'react';
import { saveAs } from 'file-saver';
import * as d3 from 'd3';
import type { Feature } from 'geojson';
import { getCountryCode, type CountryFeatureProperties } from '../Utils/Format_country_name';
import type { RelationshipData } from '../types/data';
import { ColorScale } from '../Utils/ColorScale';

interface ExportControlsProps {
  countries: Feature[];
  relationshipData: RelationshipData;
  selectedCountry: Feature | null;
  alliances: { [key: string]: string[] };
  selectedAlliance: string | null;
}

/**
 * Creates a high-resolution, full-world SVG string for exporting.
 * This function builds the SVG in memory to ensure a clean, un-zoomed,
 * full-world view, regardless of the user's current map interaction.
 * @returns An SVG string representation of the full map.
 */
const createFullMapSvgString = ({
  countries,
  relationshipData,
  selectedCountry,
  alliances,
  selectedAlliance,
}: ExportControlsProps): string => {
  const EXPORT_WIDTH = 1800;
  const EXPORT_HEIGHT = 1000;

  // Create a detached SVG element to build the export version
  const tempSvgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const tempSvg = d3.select(tempSvgNode)
    .attr('width', EXPORT_WIDTH)
    .attr('height', EXPORT_HEIGHT)
    .attr('xmlns', 'http://www.w3.org/2000/svg');

  // Add a background color rectangle
  tempSvg.append('rect')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('fill', '#1a202c'); // Dark background similar to the app

  // Define the projection for the export. We use Mercator for a flat full-world view.
  const projection = d3.geoMercator()
    .fitSize([EXPORT_WIDTH, EXPORT_HEIGHT], { type: 'FeatureCollection', features: countries });
  const pathGenerator = d3.geoPath().projection(projection);

  const selectedId = selectedCountry ? getCountryCode(selectedCountry) : null;
  const allianceMembers = selectedAlliance ? new Set(alliances[selectedAlliance]) : null;

  // Draw country paths
  tempSvg.append('g')
    .selectAll('path')
    .data(countries)
    .enter()
    .append('path')
    .attr('d', pathGenerator)
    .attr('stroke', (d: Feature) => {
      const countryCode = getCountryCode(d);
      if (selectedId && countryCode === selectedId) return '#fde047';
      if (allianceMembers && countryCode && allianceMembers.has(countryCode)) return '#FBBF24';
      return '#000'; // Black stroke for better definition on export
    })
    .attr('stroke-width', (d: Feature) => {
      const countryCode = getCountryCode(d);
      if (selectedId && countryCode === selectedId) return 1.5;
      if (allianceMembers && countryCode && allianceMembers.has(countryCode)) return 1;
      return 0.5;
    })
    .attr('fill', (d: Feature) => {
      const countryCode = getCountryCode(d);
      if (!countryCode) return '#4A5568';
      if (allianceMembers) return allianceMembers.has(countryCode) ? '#D97706' : '#4A5568';
      if (selectedId) {
        if (countryCode === selectedId) return '#3b82f6';
        const relations = relationshipData[selectedId]?.relations || {};
        return ColorScale(relations[countryCode] || 0);
      }
      return '#4A5568';
    });

  // If a country is selected, draw the relationship arcs
  if (selectedCountry && selectedId && relationshipData[selectedId]) {
    // Copy the glow filter definition for the arcs
    tempSvg.append('defs').html(`
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    `);
    
    const relations = relationshipData[selectedId].relations || {};
    const sortedRelations = Object.entries(relations).sort(([, a], [, b]) => Math.abs(b) - Math.abs(a));
    const allies = sortedRelations.filter(([, score]) => score > 0).slice(0, 5);
    const adversaries = sortedRelations.filter(([, score]) => score < 0).slice(0, 5);
    const connections = [...allies, ...adversaries];
    
    const sourceCentroid = pathGenerator.centroid(selectedCountry);
    
    connections.forEach(([targetCode, score]) => {
      const targetFeature = countries.find(c => getCountryCode(c) === targetCode);
      if (!targetFeature) return;
      const targetCentroid = pathGenerator.centroid(targetFeature);
      
      const dx = targetCentroid[0] - sourceCentroid[0];
      const dy = targetCentroid[1] - sourceCentroid[1];
      const controlX = (sourceCentroid[0] + targetCentroid[0]) / 2 + dy * 0.3;
      const controlY = (sourceCentroid[1] + targetCentroid[1]) / 2 - dx * 0.3;
      
      tempSvg.append('path')
        .attr('d', `M${sourceCentroid[0]},${sourceCentroid[1]}Q${controlX},${controlY},${targetCentroid[0]},${targetCentroid[1]}`)
        .attr('fill', 'none')
        .attr('stroke', score > 0 ? '#00FFFF' : '#FF288C')
        .attr('stroke-width', 1.5 + Math.abs(score) / 10)
        .attr('stroke-linecap', 'round')
        .style('mix-blend-mode', 'screen')
        .attr('filter', 'url(#glow)');
    });
  }

  // Serialize the final SVG to a string
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(tempSvgNode);
  source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

  return source;
};


const ExportControls: React.FC<ExportControlsProps> = (props) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const exportAsPNG = () => {
    const svgString = createFullMapSvgString(props);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scale = 2; // For higher resolution output
    
    const EXPORT_WIDTH = 1800; // Must match the dimensions used in createFullMapSvgString
    const EXPORT_HEIGHT = 1000;

    img.onload = () => {
      canvas.width = EXPORT_WIDTH * scale;
      canvas.height = EXPORT_HEIGHT * scale;
      
      ctx?.scale(scale, scale);
      ctx?.drawImage(img, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
      
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `worldties-map-${new Date().toISOString().split('T')[0]}.png`);
        }
        URL.revokeObjectURL(url);
      }, 'image/png', 1.0);
    };
    
    img.src = url;
  };

  const exportAsSVG = () => {
    const svgString = createFullMapSvgString(props);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    saveAs(blob, `worldties-map-${new Date().toISOString().split('T')[0]}.svg`);
  };

  const exportAsCSV = () => {
    // ... (This function remains unchanged)
    const { selectedCountry, relationshipData, countries } = props;
    if (!selectedCountry) {
      interface CsvRow {
        'Source Country': string;
        'Target Country': string;
        'Relationship Strength': number;
      }
      const allRelationships: CsvRow[] = [];

      Object.entries(relationshipData).forEach(([countryCode, countryData]) => {
        const country = countries.find(c => getCountryCode(c) === countryCode);
        const countryName = (country?.properties as CountryFeatureProperties)?.name || countryCode;

        Object.entries(countryData.relations).forEach(([partnerCode, strength]) => {
          const partner = countries.find(c => getCountryCode(c) === partnerCode);
          const partnerName = (partner?.properties as CountryFeatureProperties)?.name || partnerCode;

          allRelationships.push({
            'Source Country': `"${countryName}"`,
            'Target Country': `"${partnerName}"`,
            'Relationship Strength': strength,
          });
        });
      });

      if (allRelationships.length === 0) return;

      const headers = Object.keys(allRelationships[0]);
      const csvContent = [
        headers.join(','),
        ...allRelationships.map(row =>
          headers.map(header => row[header as keyof CsvRow]).join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `world-relationships-${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      const countryCode = getCountryCode(selectedCountry);
      if (!countryCode) return;

      const countryRelationships = relationshipData[countryCode]?.relations || {};

      const csvContent = [
        'Country,Relationship Strength',
        ...Object.entries(countryRelationships).map(([partnerCode, strength]) => {
          const partner = countries.find(c => getCountryCode(c) === partnerCode);
          const partnerName = (partner?.properties as CountryFeatureProperties)?.name || partnerCode;
          return `"${partnerName}",${strength}`;
        }),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const countryName = (selectedCountry.properties as CountryFeatureProperties)?.name || 'country';
      saveAs(blob, `${countryName}-relationships-${new Date().toISOString().split('T')[0]}.csv`);
    }
  };


  return (
    <div className="w-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between font-bold text-md ${isExpanded ? 'mb-2' : ''} text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-200 transition-colors`}
        aria-expanded={isExpanded}
      >
        <span>Export</span>
        <svg
          className={`w-5 h-5 transform transition-transform ${isExpanded ? '' : 'rotate-180'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="flex flex-col space-y-2">
          {/* ... (Your buttons for PNG, SVG, CSV remain here, unchanged) ... */}
           <button
              onClick={exportAsPNG}
              className="w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
              title="Export map as high-resolution PNG"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Map (PNG)
            </button>
            <button
              onClick={exportAsSVG}
              className="w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
              title="Export map as SVG"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Map (SVG)
            </button>
            <button
              onClick={exportAsCSV}
              className="w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
              title="Export relationships as CSV"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              {props.selectedCountry ? 'Country Data (CSV)' : 'All Data (CSV)'}
            </button>
        </div>
      )}
    </div>
  );
};

export default ExportControls;