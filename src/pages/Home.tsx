import { useState, useEffect, useCallback, useRef } from 'react';
import type { Feature, FeatureCollection } from 'geojson';
import type { RelationshipData } from '../types/data';

// Import components
import Header from '../components/Header';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';
import MapChart from '../components/MapChart';
import InfoPanel from '../components/InfoPanel';

// Define a type for our fetched data to be stored in state
interface AppData {
  countries: Feature[];
  relationships: RelationshipData;
  alliances: { [key: string]: string[] };
}

export default function Home() {
  // State for the fetched data
  const [appData, setAppData] = useState<AppData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for user interactions
  const [selectedCountry, setSelectedCountry] = useState<Feature | null>(null);
  const [selectedAlliance, setSelectedAlliance] = useState<string | null>(null);
  const [projectionName, setProjectionName] = useState<'geoMercator' | 'geoOrthographic'>('geoMercator');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const mapRef = useRef<SVGSVGElement>(null);

  // Effect to fetch all necessary data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all data files in parallel for efficiency
        const [worldRes, relRes, allianceRes] = await Promise.all([
          fetch('/data/world_map_medium.json'),
          fetch('/data/relationships.json'),
          fetch('/data/alliances.json'),
        ]);

        if (!worldRes.ok || !relRes.ok || !allianceRes.ok) {
          throw new Error('Network response was not ok');
        }

        const worldData = await worldRes.json() as FeatureCollection;
        const relationships = await relRes.json() as RelationshipData;
        const alliances = await allianceRes.json();
        
        setAppData({
          countries: worldData.features,
          relationships,
          alliances,
        });
      } catch (err) {
        console.error("Failed to fetch map data:", err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred while loading data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []); // Empty dependency array ensures this runs only once

  // Memoized handlers for selection logic
  const handleCountrySelect = useCallback((country: Feature | null) => {
    setSelectedCountry(country);
    if (country) {
      setSelectedAlliance(null);
    }
    // Close mobile menu on selection
    setIsMobileMenuOpen(false);
  }, []);

  const handleAllianceSelect = useCallback((alliance: string | null) => {
    setSelectedAlliance(alliance);
    if (alliance) {
      setSelectedCountry(null);
    }
  }, []);

  const handleProjectionChange = useCallback((name: 'geoMercator' | 'geoOrthographic') => {
    setProjectionName(name);
  }, []);

  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);

  // --- Render logic based on loading and error states ---

  if (isLoading) {
    return <div className="w-full h-screen flex items-center justify-center bg-gray-900 text-white">Loading Map Data...</div>;
  }

  if (error || !appData) {
    return <div className="w-full h-screen flex flex-col items-center justify-center bg-red-100 text-red-800">
      <h2 className="text-2xl font-bold">Failed to load Application Data</h2>
      <p className="mt-2">{error || 'The application data could not be found.'}</p>
    </div>;
  }

  // --- Main component render once data is loaded ---
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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
          )}
        </button>

        {/* Sidebar */}
        <div className={`fixed md:static inset-y-0 left-0 z-30 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out`}>
          <div className="h-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg md:backdrop-blur-sm border-r border-gray-200 dark:border-gray-700 shadow-xl md:shadow-none">
            <Sidebar 
              countries={appData.countries}
              selectedCountry={selectedCountry}
              onCountrySelect={handleCountrySelect}
              alliances={appData.alliances}
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
            role="button" tabIndex={0} aria-label="Close menu"
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={closeMobileMenu}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') closeMobileMenu(); }}
          />
        )}

        {/* Main content */}
        <div className="flex-1 relative w-full h-full">
          <MapChart
            ref={mapRef}
            countries={appData.countries}
            relationshipData={appData.relationships}
            selectedCountry={selectedCountry}
            onCountrySelect={handleCountrySelect}
            alliances={appData.alliances}
            selectedAlliance={selectedAlliance}
            projectionName={projectionName}
          />
          <InfoPanel 
            selectedCountry={selectedCountry}
            relationshipData={appData.relationships}
            onClose={() => handleCountrySelect(null)}
            onCountrySelect={handleCountrySelect}
            countries={appData.countries}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}