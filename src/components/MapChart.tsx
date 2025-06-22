import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import * as d3 from 'd3';
import type { Feature } from 'geojson';
import type { RelationshipData } from '../pages/Home';
import { ColorScale } from '../Utils/ColorScale';
import { getCountryCode } from '../Utils/Format_country_name';
import Legend from './Legend';
import ExportControls from './ExportControls';

interface MapChartProps {
  countries: Feature[];
  relationshipData: RelationshipData;
  selectedCountry: Feature | null;
  onCountrySelect: (country: Feature | null) => void;
  alliances: { [key: string]: string[] };
  selectedAlliance: string | null;
  projectionName: 'geoMercator' | 'geoOrthographic';
}

const MapChart = forwardRef<SVGSVGElement, MapChartProps>(({ 
  countries, 
  relationshipData, 
  selectedCountry, 
  onCountrySelect, 
  alliances, 
  selectedAlliance, 
  projectionName 
}, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState<[number, number]>([20, -20]);

  // Forward the ref to the parent component
  useImperativeHandle(ref, () => svgRef.current!);

  // Effect for initial setup, resizing, and path creation
  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = svg.select<SVGGElement>('.map-container');
    const tooltip = d3.select(wrapperRef.current).select<HTMLDivElement>('#tooltip');

    // Add click handler to the SVG for deselecting when clicking the background
    svg.on('click', () => {
      onCountrySelect(null);
    });

    const updateMapLayout = () => {
      const wrapper = wrapperRef.current!;
      const { width, height } = wrapper.getBoundingClientRect();

      svg.attr('viewBox', [0, 0, width, height].join(' '));

      let projection;
      if (projectionName === 'geoOrthographic') {
        projection = d3.geoOrthographic()
          .scale(Math.min(width, height) / 2 - 20)
          .translate([width / 2, height / 2])
          .clipAngle(90)
          .rotate(rotation);
      } else {
        projection = d3.geoMercator().fitExtent([[20, 20], [width - 20, height - 20]], { type: 'FeatureCollection', features: countries });
      }

      const pathGenerator = d3.geoPath().projection(projection);

      const countryPaths = g.selectAll<SVGPathElement, Feature>('.country')
        .data(countries, (d: Feature) => getCountryCode(d) || String(d.id));

      // Enter selection
      countryPaths.enter()
        .append('path')
        .attr('class', 'country')
        .style('cursor', 'pointer')
        .on('click', (event: MouseEvent, d: Feature) => {
          // Stop the event from bubbling up to the SVG's click handler
          event.stopPropagation();
          onCountrySelect(d);
        })
        .on('mouseover', () => {
          tooltip.style('opacity', 1);
        })
        .on('mousemove', (event: MouseEvent, d: Feature) => {
          const countryName = (d.properties as any)?.name || 'N/A';
          const [x, y] = d3.pointer(event, wrapperRef.current);
          tooltip
            .html(countryName)
            .style('left', `${x + 15}px`)
            .style('top', `${y}px`);
        })
        .on('mouseout', () => {
          tooltip.style('opacity', 0);
        })
        .attr('d', pathGenerator);

      // Update selection
      g.selectAll<SVGPathElement, Feature>('.country').attr('d', pathGenerator);

      // Exit selection
      countryPaths.exit().remove();
    };

    const resizeObserver = new ResizeObserver(updateMapLayout);
    resizeObserver.observe(wrapperRef.current);
    updateMapLayout(); // Initial call

    return () => {
      resizeObserver.disconnect();
      svg.on('click', null); // Clean up the listener
    };
  }, [countries, onCountrySelect, projectionName, rotation]); // Re-run on projection change

  // Effect for zoom, pan, and drag interactions
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const mapG = svg.select<SVGGElement>('.map-container');
    const arcsG = svg.select<SVGGElement>('.arcs-container');

    // Remove any existing behaviors before attaching new ones to prevent conflicts
    svg.on('.zoom', null);
    svg.on('.drag', null);

    if (projectionName === 'geoOrthographic') {
      // For orthographic projection, enable drag-to-rotate
      mapG.attr('transform', ''); // Reset any zoom transform
      arcsG.attr('transform', ''); // Reset any zoom transform
      
      const dragBehavior = d3.drag<SVGSVGElement, unknown>()
        .on('start', () => svg.classed('dragging', true))
        .on('drag', (event) => {
          const k = 0.5; // Rotation sensitivity
          setRotation(prevRotation => [
            prevRotation[0] + event.dx * k,
            // Clamp vertical rotation to avoid flipping the globe upside down
            Math.max(-90, Math.min(90, prevRotation[1] - event.dy * k))
          ]);
        })
        .on('end', () => svg.classed('dragging', false));
      
      svg.call(dragBehavior);
    } else {
      // For Mercator projection, enable D3's zoom/pan behavior for mouse and touch
      const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([1, 8])
        .on('start', () => svg.classed('zooming', true))
        .on('zoom', (event) => {
          const { transform } = event;
          // Apply the transform to both the map and the arcs
          mapG.attr('transform', transform.toString());
          arcsG.attr('transform', transform.toString());
        })
        .on('end', () => svg.classed('zooming', false));
      
      svg.call(zoomBehavior)
         .on('dblclick.zoom', null); // Disable double-click zoom
    }
  }, [projectionName, rotation]); // Rerun when projection changes or globe is rotated


  // Effect for updating styles when selectedCountry or selectedAlliance changes
  useEffect(() => {
    if (!svgRef.current) return;

    const g = d3.select(svgRef.current).select<SVGGElement>('.map-container');
    const selectedId = selectedCountry ? getCountryCode(selectedCountry) : null;
    const allianceMembers = selectedAlliance ? new Set(alliances[selectedAlliance]) : null;

    g.selectAll<SVGPathElement, Feature>('.country')
      .transition()
      .duration(300)
      .attr('fill', (d: Feature) => {
        const countryCode = getCountryCode(d);
        if (!countryCode) return '#4A5568';

        if (allianceMembers) {
          return allianceMembers.has(countryCode) ? '#D97706' : '#4A5568'; // Amber-600 for members
        }

        if (selectedId) {
          if (countryCode === selectedId) return '#3b82f6'; // Blue-500
          const relations = relationshipData[selectedId]?.relations || {};
          return ColorScale(relations[countryCode] || 0);
        }

        return '#4A5568'; // Gray-600
      })
      .attr('stroke', (d: Feature) => {
        const countryCode = getCountryCode(d);
        if (selectedId && countryCode === selectedId) return '#fde047'; // Yellow-300
        if (allianceMembers && countryCode && allianceMembers.has(countryCode)) return '#FBBF24'; // Amber-400
        return '#1a202c';
      })
      .attr('stroke-width', (d: Feature) => {
        const countryCode = getCountryCode(d);
        if (selectedId && countryCode === selectedId) return 1.5;
        if (allianceMembers && countryCode && allianceMembers.has(countryCode)) return 1;
        return 0.5;
      });
      
    // Bring selected/alliance countries to the front
    g.selectAll('.country').sort((a, b) => {
      const codeA = getCountryCode(a as Feature);
      const codeB = getCountryCode(b as Feature);
      
      const isASelected = codeA === selectedId || (allianceMembers && codeA && allianceMembers.has(codeA));
      const isBSelected = codeB === selectedId || (allianceMembers && codeB && allianceMembers.has(codeB));

      if (isASelected && !isBSelected) return 1;
      if (!isASelected && isBSelected) return -1;
      return 0;
    });

  }, [selectedCountry, relationshipData, selectedAlliance, alliances]);

  // Effect for drawing animated arcs
  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = svg.select<SVGGElement>('.arcs-container');
    
    // Clear previous arcs
    g.selectAll('path.arc').remove();

    if (!selectedCountry) {
        return; // No country selected, so no arcs to draw
    }

    const { width, height } = wrapperRef.current.getBoundingClientRect();
    let projection;
    if (projectionName === 'geoOrthographic') {
        projection = d3.geoOrthographic()
            .scale(Math.min(width, height) / 2 - 20)
            .translate([width / 2, height / 2])
            .clipAngle(90)
            .rotate(rotation);
    } else {
        projection = d3.geoMercator()
            .fitExtent([[20, 20], [width - 20, height - 20]], { type: 'FeatureCollection', features: countries });
    }
    const pathGenerator = d3.geoPath().projection(projection);

    const selectedId = getCountryCode(selectedCountry);
    if (!selectedId || !relationshipData[selectedId]) return;

    const relations = relationshipData[selectedId].relations || {};
    
    const sortedRelations = Object.entries(relations)
        .sort(([, scoreA], [, scoreB]) => Math.abs(scoreB) - Math.abs(scoreA));
        
    const allies = sortedRelations.filter(([, score]) => score > 0).slice(0, 5);
    const adversaries = sortedRelations.filter(([, score]) => score < 0).slice(0, 5);
    const connections = [...allies, ...adversaries];

    const sourceCentroid = pathGenerator.centroid(selectedCountry);

    const arcData = connections.map(([targetCode, score]) => {
        const targetFeature = countries.find(c => getCountryCode(c) === targetCode);
        if (!targetFeature) return null;
        
        const targetCentroid = pathGenerator.centroid(targetFeature);
        
        return {
            source: sourceCentroid,
            target: targetCentroid,
            score: score,
            key: `${selectedId}-${targetCode}`
        };
    }).filter((d): d is NonNullable<typeof d> => d !== null);

    g.selectAll('path.arc')
        .data(arcData, (d: any) => d.key)
        .join(
            enter => {
                const path = enter.append('path')
                    .attr('class', 'arc')
                    .attr('fill', 'none')
                    .attr('stroke', d => d.score > 0 ? '#00FFFF' : '#FF288C') // Cyan for allies, Magenta for adversaries
                    .attr('stroke-width', d => 1.5 + Math.abs(d.score) / 10) // Slightly thicker base
                    .attr('stroke-linecap', 'round')
                    .style('mix-blend-mode', 'screen')
                    .attr('filter', 'url(#glow)')
                    .attr('d', d => {
                        const dx = d.target[0] - d.source[0];
                        const dy = d.target[1] - d.source[1];
                        // Using a quadratic Bezier curve for a nice arc
                        const midX = (d.source[0] + d.target[0]) / 2;
                        const midY = (d.source[1] + d.target[1]) / 2;
                        const controlX = midX + dy * 0.3; // Adjust curvature
                        const controlY = midY - dx * 0.3;
                        return `M${d.source[0]},${d.source[1]}Q${controlX},${controlY},${d.target[0]},${d.target[1]}`;
                    });

                path.each(function() {
                    const length = this.getTotalLength();
                    d3.select(this)
                        .attr('stroke-dasharray', `${length} ${length}`)
                        .attr('stroke-dashoffset', length)
                        .transition()
                        .duration(1500)
                        .ease(d3.easeCubicInOut)
                        .attr('stroke-dashoffset', 0);
                });
                return path;
            }
        );

  }, [selectedCountry, countries, relationshipData, projectionName, rotation]);

  return (
    <div ref={wrapperRef} className="w-full h-full flex items-center justify-center relative">
      <svg ref={svgRef} className="w-full h-full">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g className="map-container"></g>
        <g className="arcs-container"></g>
      </svg>
      
      {/* Bottom left container for Legend and ExportControls */}
      <div className="absolute bottom-4 left-4 w-64 space-y-4">
        <div className="bg-white/80 dark:bg-gray-800/60 p-4 rounded-xl shadow-2xl backdrop-blur-md border border-gray-200 dark:border-white/10">
          <Legend />
        </div>
        
        <div className="bg-white/80 dark:bg-gray-800/60 p-4 rounded-xl shadow-2xl backdrop-blur-md border border-gray-200 dark:border-white/10">
          <ExportControls 
            svgRef={svgRef}
            selectedCountry={selectedCountry}
            relationshipData={relationshipData}
            countries={countries}
          />
        </div>
      </div>
      
      <div id="tooltip" style={{
        position: 'absolute',
        opacity: 0,
        pointerEvents: 'none',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '14px',
        fontFamily: 'sans-serif'
      }}></div>
    </div>
  );
});

MapChart.displayName = 'MapChart';

export default MapChart;