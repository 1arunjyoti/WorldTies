import { useCallback, useRef } from 'react';

// Import Redux hooks and actions
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toggleMobileMenu, setMobileMenuOpen, selectMobileMenuOpen, selectSelectedCountry, selectSelectedAlliance } from '../store/slices/uiSlice';
import { useWorldMapData, useRelationshipsData, useAlliancesData } from '../hooks/useData';
import { useUrlState } from '../hooks/useUrlState';

// Import components
import Header from '../components/Header';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';
import MapChart from '../components/MapChart';
import InfoPanel from '../components/InfoPanel';
import ExportControls from '../components/ExportControls';

export default function Home() {
  const dispatch = useAppDispatch();
  
  // Select UI state from Redux store
  const isMobileMenuOpen = useAppSelector(selectMobileMenuOpen);
  const selectedCountry = useAppSelector(selectSelectedCountry);
  const selectedAlliance = useAppSelector(selectSelectedAlliance);

  // Fetch data using React Query
  const { data: worldMapData, isLoading: isLoadingMap, error: mapError } = useWorldMapData();
  const { data: alliancesData, isLoading: isLoadingAlliances, error: alliancesError } = useAlliancesData();
  // Lazy-load relationship data only when a country is selected
  const { data: relationshipsData, isLoading: isLoadingRelationships, error: relationshipsError } = useRelationshipsData({ enabled: !!selectedCountry });

  // Initialize and manage URL state
  useUrlState(worldMapData?.features);
  
  const mapRef = useRef<SVGSVGElement>(null);

  const closeMobileMenu = useCallback(() => dispatch(setMobileMenuOpen(false)), [dispatch]);

  const isInitialLoading = isLoadingMap || isLoadingAlliances;
  const isRelationshipsLoading = isLoadingRelationships;
  const error = mapError || relationshipsError || alliancesError;

  // --- Render logic based on loading and error states ---

  if (isInitialLoading) {
    return <div className="w-full h-screen flex items-center justify-center bg-gray-900 text-white">Loading Map Data...</div>;
  }

  if (error) {
    return <div className="w-full h-screen flex flex-col items-center justify-center bg-red-100 text-red-800">
      <h2 className="text-2xl font-bold">Failed to load Application Data</h2>
      <p className="mt-2">{error.message || 'The application data could not be found.'}</p>
    </div>;
  }

  if (!worldMapData || !alliancesData) {
    // This case should ideally be covered by the `isLoading` flag, but it's a good safeguard.
    return <div className="w-full h-screen flex items-center justify-center bg-gray-900 text-white">Preparing data...</div>;
  }

  // --- Main component render once data is loaded ---
  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-['Inter',_sans-serif] overflow-hidden transition-colors duration-300">
      <Header />
      <main className="flex flex-1 flex-col md:flex-row overflow-hidden relative">
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

        {/* Main content */}
        <div className="flex-1 relative w-full h-full">
          <MapChart ref={mapRef} countries={worldMapData.features} relationshipData={relationshipsData || {}} alliances={alliancesData} />
          <InfoPanel countries={worldMapData.features} relationshipData={relationshipsData || {}} isLoading={isRelationshipsLoading} />
          <ExportControls 
            countries={worldMapData.features} 
            relationshipData={relationshipsData || {}} 
            alliances={alliancesData} 
            selectedCountry={selectedCountry}
            selectedAlliance={selectedAlliance}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}