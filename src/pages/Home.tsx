import { useState, useMemo, useCallback, useRef } from 'react';
import type { Feature, FeatureCollection, Geometry } from 'geojson';

import worldData from '../data/world_map_medium.json';
import relationshipData from '../data/relationships.json';
import alliancesData from '../data/alliances.json';

// Import components
import Header from '../components/Header';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';
import MapChart from '../components/MapChart';
import InfoPanel from '../components/InfoPanel';

// Type definition for our relationship data
export interface RelationshipData {
  [key: string]: {
    name: string;
    relations: { [partnerCode: string]: number };
  };
}

export default function Home() {
  const [selectedCountry, setSelectedCountry] = useState<Feature | null>(null);
  const [selectedAlliance, setSelectedAlliance] = useState<string | null>(null);
  const [projectionName, setProjectionName] = useState<'geoMercator' | 'geoOrthographic'>('geoMercator');
  const mapRef = useRef<SVGSVGElement>(null);
  
  const countryFeatures = useMemo(() => {
    return (worldData as FeatureCollection<Geometry, { name: string }>).features;
  }, []); 

  const handleCountrySelect = useCallback((country: Feature | null) => {
    setSelectedCountry(country);
    if (country) {
      setSelectedAlliance(null); // Deselect alliance when a country is selected
    }
  }, []);

  const handleAllianceSelect = useCallback((alliance: string | null) => {
    setSelectedAlliance(alliance);
    if (alliance) {
      setSelectedCountry(null); // Deselect country when an alliance is selected
    }
  }, []);

  const handleProjectionChange = useCallback((name: 'geoMercator' | 'geoOrthographic') => {
    setProjectionName(name);
  }, []);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-['Inter',_sans-serif] overflow-hidden transition-colors duration-300">
      <Header />
      <main className="flex flex-1 flex-col md:flex-row overflow-hidden relative">
        {/* Mobile menu button */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-md bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border border-gray-200 dark:border-gray-700"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          )}
        </button>

        {/* Sidebar */}
        <div className={`fixed md:static inset-y-0 left-0 z-30 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out`}>
          <div className="h-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg md:backdrop-blur-sm border-r border-gray-200 dark:border-gray-700 shadow-xl md:shadow-none">
            <Sidebar 
              countries={countryFeatures}
              selectedCountry={selectedCountry}
              onCountrySelect={(country) => {
                handleCountrySelect(country);
                closeMobileMenu();
              }}
              alliances={alliancesData}
              selectedAlliance={selectedAlliance}
              onAllianceSelect={handleAllianceSelect}
              projectionName={projectionName}
              onProjectionChange={handleProjectionChange}
            />
          </div>
        </div>

        {/* Overlay for mobile menu */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={closeMobileMenu}
          />
        )}

        {/* Main content */}
        <div className="flex-1 relative w-full h-full">
          <MapChart
            countries={countryFeatures}
            relationshipData={relationshipData as RelationshipData}
            selectedCountry={selectedCountry}
            onCountrySelect={handleCountrySelect}
            alliances={alliancesData}
            selectedAlliance={selectedAlliance}
            projectionName={projectionName}
            ref={mapRef}
          />
          <InfoPanel 
            selectedCountry={selectedCountry}
            relationshipData={relationshipData as RelationshipData}
            onClose={() => handleCountrySelect(null)}
            onCountrySelect={handleCountrySelect}
            countries={countryFeatures}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}