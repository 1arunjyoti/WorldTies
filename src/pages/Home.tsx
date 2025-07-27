import { useCallback, useRef } from 'react';

// Import Redux hooks and actions
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toggleMobileMenu, setMobileMenuOpen, selectMobileMenuOpen, selectSelectedCountry } from '../store/slices/uiSlice';
import { useWorldMapData, useRelationshipsData, useAlliancesData } from '../hooks/useData';
import { useUrlState } from '../hooks/useUrlState';

// Import components
import Header from '../components/Header';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';
import MapChart from '../components/MapChart';
import type { FeatureCollection } from 'geojson';
import InfoPanel from '../components/InfoPanel';

// This component will only be rendered once the data has loaded.
const MainContent = ({ worldMapData, alliancesData, relationshipsData }: { worldMapData: FeatureCollection, alliancesData: any, relationshipsData: any }) => {
  const dispatch = useAppDispatch();
  const isMobileMenuOpen = useAppSelector(selectMobileMenuOpen);
  const mapRef = useRef<SVGSVGElement>(null);

  // This hook is now called here, where worldMapData is guaranteed to exist.
  useUrlState(worldMapData.features);

  const closeMobileMenu = useCallback(() => dispatch(setMobileMenuOpen(false)), [dispatch]);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => dispatch(toggleMobileMenu())}
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
          <Sidebar countries={worldMapData.features} alliances={alliancesData} />
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

      {/* Map */}
      <div className="flex-1 relative w-full h-full">
        <MapChart ref={mapRef} countries={worldMapData.features} relationshipData={relationshipsData || {}} alliances={alliancesData} />
      </div>
    </>
  );
};


export default function Home() {
  const selectedCountry = useAppSelector(selectSelectedCountry);

  // Fetch all necessary data
  const { data: worldMapData, isLoading: isLoadingMap, error: mapError } = useWorldMapData();
  const { data: alliancesData, isLoading: isLoadingAlliances, error: alliancesError } = useAlliancesData();
  // --- CHANGE: Destructure specific loading and error states for relationships ---
  const { 
    data: relationshipsData, 
    isLoading: isLoadingRelationships, 
    error: relationshipsError 
  } = useRelationshipsData({ enabled: !!selectedCountry });

  const isInitialLoading = isLoadingMap || isLoadingAlliances;
  // --- CHANGE: Only handle critical errors that prevent the map from loading ---
  const criticalError = mapError || alliancesError;

  if (isInitialLoading) {
    return <div className="w-full h-screen flex items-center justify-center bg-white dark:bg-gray-900 text-gray-900 dark:text-white">Loading Map Data...</div>;
  }

  // --- CHANGE: This block now only triggers for critical failures ---
  if (criticalError) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-red-100 text-red-800">
        <h2 className="text-2xl font-bold">Failed to load Application Data</h2>
        <p className="mt-2">{criticalError.message || 'An unknown error occurred.'}</p>
      </div>
    );
  }

  if (!worldMapData || !alliancesData) {
    return <div className="w-full h-screen flex items-center justify-center bg-gray-900 text-white">Preparing data...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-['Inter',_sans-serif] overflow-hidden transition-colors duration-300">
      <Header />
      <main className="flex flex-1 flex-col md:flex-row overflow-hidden relative">
        <MainContent
          worldMapData={worldMapData}
          alliancesData={alliancesData}
          relationshipsData={relationshipsData}
        />
        {/* --- CHANGE: Pass the specific loading and error states to InfoPanel --- */}
        <InfoPanel
          countries={worldMapData.features}
          relationshipData={relationshipsData || {}}
          isLoading={isLoadingRelationships}
          error={relationshipsError}
        />
      </main>
      <Footer />
    </div>
  );
}