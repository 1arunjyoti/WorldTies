import { useRef, useEffect, forwardRef, useImperativeHandle, memo, useCallback, useMemo, useState } from 'react';
import * as d3 from 'd3';
import type { Feature } from 'geojson';

import { ColorScale } from '../Utils/ColorScale';
import { getCountryCode, type CountryFeatureProperties } from '../Utils/Format_country_name';
import Legend from './Legend';

import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectCountry as selectCountryAction, selectSelectedCountry, selectSelectedAlliance, selectProjectionType, setMapRotation, selectMapRotation } from '../store/slices/uiSlice';
import type { RelationshipData } from '../types/data';
import ExportControls from './ExportControls';

interface ArcDataItem {
  source: [number, number];
  target: [number, number];
  score: number;
  key: string;
}

interface MapChartProps {
  countries: Feature[];
  relationshipData: RelationshipData;
  alliances: { [key: string]: string[] };
}

const MapChartInternal = forwardRef<SVGSVGElement, MapChartProps>(({ countries, relationshipData, alliances }, ref) => {
  const dispatch = useAppDispatch();
  const selectedCountry = useAppSelector(selectSelectedCountry);
  const selectedAlliance = useAppSelector(selectSelectedAlliance);
  const projectionName = useAppSelector(selectProjectionType);
  const rotation = useAppSelector(selectMapRotation);

  const handleCountrySelect = useCallback((country: Feature | null) => {
    dispatch(selectCountryAction(country));
  }, [dispatch]);

  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // State to hold map dimensions for memoization
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useImperativeHandle(ref, () => svgRef.current!);

  // Optimized country lookup map ---
  const countryMap = useMemo(() => {
    const map = new Map<string, Feature>();
    countries.forEach(c => {
      const code = getCountryCode(c);
      if (code) map.set(code, c);
    });
    return map;
  }, [countries]);

  // Consolidated projection logic ---
  const projection = useMemo(() => {
    const { width, height } = dimensions;
    if (width === 0 || height === 0) return null;

    if (projectionName === 'geoOrthographic') {
      return d3.geoOrthographic()
        .scale(Math.min(width, height) / 2 - 20)
        .translate([width / 2, height / 2])
        .clipAngle(90)
        .rotate(rotation);
    }
    return d3.geoMercator().fitExtent(
        [[20, 20], [width - 20, height - 20]],
        { type: 'FeatureCollection', features: countries }
    );
  }, [countries, projectionName, rotation, dimensions]);

  const pathGenerator = useMemo(() => {
    return projection ? d3.geoPath().projection(projection) : null;
  }, [projection]);

  // Effect to manage responsive dimensions
  useEffect(() => {
    if (!wrapperRef.current) return;
    const updateDimensions = () => {
        const { width, height } = wrapperRef.current!.getBoundingClientRect();
        setDimensions({ width, height });
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(wrapperRef.current);
    updateDimensions();

    return () => resizeObserver.disconnect();
  }, []);

  // Effect for initial setup, resizing, and path creation
  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current || !pathGenerator) return;

    const svg = d3.select(svgRef.current);
    const g = svg.select<SVGGElement>('.map-container');
    const tooltip = d3.select(wrapperRef.current).select<HTMLDivElement>('#tooltip');
    
    svg.attr('viewBox', [0, 0, dimensions.width, dimensions.height].join(' '));

    svg.on('click', () => handleCountrySelect(null));

    const countryPaths = g.selectAll<SVGPathElement, Feature>('.country')
      .data(countries, (d: Feature) => getCountryCode(d) || String(d.id));

    countryPaths.enter()
      .append('path')
      .attr('class', 'country')
      .style('cursor', 'pointer')
      .on('click', (event: MouseEvent, d: Feature) => {
        event.stopPropagation();
        handleCountrySelect(d);
      })
      .on('mouseover', () => tooltip.style('opacity', 1))
      .on('mousemove', (event: MouseEvent, d: Feature) => {
        const countryName = (d.properties as CountryFeatureProperties)?.name || 'N/A';
        const [x, y] = d3.pointer(event, wrapperRef.current);
        tooltip.html(countryName).style('left', `${x + 15}px`).style('top', `${y}px`);
      })
      .on('mouseout', () => tooltip.style('opacity', 0))
      .merge(countryPaths) // Merge enter and update selections
      .attr('d', pathGenerator);

    countryPaths.exit().remove();

    return () => { svg.on('click', null); };
  }, [countries, handleCountrySelect, pathGenerator, dimensions]);

  // Effect for zoom, pan, and drag interactions
  useEffect(() => {
    if (!svgRef.current || !projection) return;

    const svg = d3.select(svgRef.current);
    const mapG = svg.select<SVGGElement>('.map-container');
    const arcsG = svg.select<SVGGElement>('.arcs-container');

    svg.on('.zoom', null);
    svg.on('.drag', null);

    if (projectionName === 'geoOrthographic') {
      mapG.attr('transform', '');
      arcsG.attr('transform', '');
      
      const dragBehavior = d3.drag<SVGSVGElement, unknown>()
        .on('start', () => svg.classed('dragging', true))
        .on('drag', (event) => {
          const k = 0.5;
          dispatch(setMapRotation([
            rotation[0] + event.dx * k,
            Math.max(-90, Math.min(90, rotation[1] - event.dy * k))
          ]));
        })
        .on('end', () => svg.classed('dragging', false));
      svg.call(dragBehavior);
    } else {
      const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([1, 8])
        .on('start', () => svg.classed('zooming', true))
        .on('zoom', (event) => {
          const { transform } = event;
          mapG.attr('transform', transform.toString());
          arcsG.attr('transform', transform.toString());
        })
        .on('end', () => svg.classed('zooming', false));
      svg.call(zoomBehavior).on('dblclick.zoom', null);
    }
  }, [projectionName, rotation, projection, dispatch]);

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
        if (allianceMembers) return allianceMembers.has(countryCode) ? '#D97706' : '#4A5568';
        if (selectedId) {
          if (countryCode === selectedId) return '#3b82f6';
          const relations = relationshipData[selectedId]?.relations || {};
          return ColorScale(relations[countryCode] || 0);
        }
        return '#4A5568';
      })
      .attr('stroke', (d: Feature) => {
        const countryCode = getCountryCode(d);
        if (selectedId && countryCode === selectedId) return '#fde047';
        if (allianceMembers && countryCode && allianceMembers.has(countryCode)) return '#FBBF24';
        return '#1a202c';
      })
      .attr('stroke-width', (d: Feature) => {
        const countryCode = getCountryCode(d);
        if (selectedId && countryCode === selectedId) return 1.5;
        if (allianceMembers && countryCode && allianceMembers.has(countryCode)) return 1;
        return 0.5;
      });
      
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
    // Depend on memoized helpers ---
    if (!svgRef.current || !pathGenerator || !selectedCountry) {
        d3.select(svgRef.current).select<SVGGElement>('.arcs-container').selectAll('path.arc').remove();
        return;
    }

    const g = d3.select(svgRef.current).select<SVGGElement>('.arcs-container');
    const selectedId = getCountryCode(selectedCountry);
    if (!selectedId || !relationshipData[selectedId]) return;

    const relations = relationshipData[selectedId].relations || {};
    const sortedRelations = Object.entries(relations).sort(([, scoreA], [, scoreB]) => Math.abs(scoreB) - Math.abs(scoreA));
    const allies = sortedRelations.filter(([, score]) => score > 0).slice(0, 5);
    const adversaries = sortedRelations.filter(([, score]) => score < 0).slice(0, 5);
    const connections = [...allies, ...adversaries];
    const sourceCentroid = pathGenerator.centroid(selectedCountry);

    const arcData = connections.map(([targetCode, score]) => {
      // Use optimized O(1) lookup ---
      const targetFeature = countryMap.get(targetCode);
      if (!targetFeature) return null;
      
      const targetCentroid = pathGenerator.centroid(targetFeature);
      
      return { source: sourceCentroid, target: targetCentroid, score, key: `${selectedId}-${targetCode}` };
    }).filter((d): d is NonNullable<typeof d> => d !== null);

    g.selectAll<SVGPathElement, ArcDataItem>('path.arc')
      .data(arcData, d => d.key)
      .join(
        enter => {
          const path = enter.append('path')
            .attr('class', 'arc')
            .attr('fill', 'none')
            .attr('stroke', d => d.score > 0 ? '#00FFFF' : '#FF288C')
            .attr('stroke-width', d => 1.5 + Math.abs(d.score) / 10)
            .attr('stroke-linecap', 'round')
            .style('mix-blend-mode', 'screen')
            .attr('filter', 'url(#glow)')
            .attr('d', d => {
              const dx = d.target[0] - d.source[0], dy = d.target[1] - d.source[1];
              const midX = (d.source[0] + d.target[0]) / 2, midY = (d.source[1] + d.target[1]) / 2;
              const controlX = midX + dy * 0.3, controlY = midY - dx * 0.3;
              return `M${d.source[0]},${d.source[1]}Q${controlX},${controlY},${d.target[0]},${d.target[1]}`;
            });

          path.each(function() {
            const length = this.getTotalLength();
            d3.select(this)
              .attr('stroke-dasharray', `${length} ${length}`)
              .attr('stroke-dashoffset', length)
              .transition().duration(1500).ease(d3.easeCubicInOut).attr('stroke-dashoffset', 0);
          });
          return path;
        },
        update => update,
        exit => exit.transition().duration(500).attr('stroke-opacity', 0).remove()
      );
  }, [selectedCountry, relationshipData, pathGenerator, countryMap]);

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
      
      <div className="absolute bottom-4 left-4 w-64 space-y-4">
        <div className="bg-white/80 dark:bg-gray-800/60 p-4 rounded-xl shadow-2xl backdrop-blur-md border border-gray-200 dark:border-white/10">
          <Legend />
          <div className="mt-5"></div>
          <ExportControls
            countries={countries}
            relationshipData={relationshipData}
            alliances={alliances}
            selectedCountry={selectedCountry}
            selectedAlliance={selectedAlliance}
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

const MapChart = memo(MapChartInternal);
MapChart.displayName = 'MapChart';
export default MapChart;