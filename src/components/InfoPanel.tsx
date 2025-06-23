import React, { useState, useEffect, useMemo, memo } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import type { Feature } from 'geojson';
import type { RelationshipData } from '../types/data';
import { getCountryCode, getCountryName } from '../Utils/Format_country_name';
import { ColorScale } from '../Utils/ColorScale';
import { conflictZones } from '../types/conflict';

interface InfoPanelProps {
  selectedCountry: Feature | null;
  relationshipData: RelationshipData;
  countries: Feature[];
  onClose: () => void;
  onCountrySelect: (country: Feature) => void;
}

// A small helper component to avoid repetition
const RelationListInternal: React.FC<{
  title: string;
  titleColor: string;
  relations: [string, number][];
  relationshipData: RelationshipData;
  onItemClick: (partnerId: string) => void;
}> = ({ title, titleColor, relations, relationshipData, onItemClick }) => (
  <div>
    <h3 className={`text-sm font-bold ${titleColor} mb-2 uppercase tracking-wider`}>{title}</h3>
    <ul className="space-y-1">
      {relations.map(([partnerId, score]) => (
        <li key={partnerId}>
          <button
            onClick={() => onItemClick(partnerId)}
            className="w-full flex justify-between items-center text-sm p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <span className="text-gray-600 dark:text-gray-300">{relationshipData[partnerId]?.name || partnerId}</span>
            <span className="font-bold text-base" style={{ color: ColorScale(score) }}>
              {score > 0 ? `+${score}` : score}
            </span>
          </button>
        </li>
      ))}
    </ul>
  </div>
);
const RelationList = memo(RelationListInternal);

const InfoPanelInternal: React.FC<InfoPanelProps> = ({ selectedCountry, relationshipData, countries, onClose, onCountrySelect }) => {
  // State to manage the panel's position on mobile/tablet
  const [panelState, setPanelState] = useState<'closed' | 'peek' | 'expanded'>('closed');
  
  const countryId = getCountryCode(selectedCountry);
  const countryData = countryId ? relationshipData[countryId] : null;

  // Sync our internal panel state with the selectedCountry prop from the parent
  useEffect(() => {
    if (selectedCountry && countryData) {
      setPanelState('peek'); // When a country is selected, open to "peek" view
    } else {
      setPanelState('closed'); // When deselected, close the panel
    }
  }, [selectedCountry, countryData]);

  // --- Data processing with useMemo for performance ---
  const relations = useMemo(() => (countryData?.relations ? Object.entries(countryData.relations) : []), [countryData]);

    const friendlyRelations = useMemo(() => relations
    .filter(([, score]: [string, number]) => score > 0)
    .sort(([, a]: [string, number], [, b]: [string, number]) => b - a)
    .slice(0, 5), [relations]);

    const hostileRelations = useMemo(() => relations
    .filter(([, score]: [string, number]) => score < 0)
    .sort(([, a]: [string, number], [, b]: [string, number]) => a - b)
    .slice(0, 5), [relations]);

  const relevantConflicts = useMemo(() => {
    if (!countryId) return [];
    return conflictZones.filter(conflict => conflict.countries.includes(countryId));
  }, [countryId]);

  // --- Event Handlers ---
  const handleItemClick = (partnerId: string) => {
    const newSelectedCountry = countries.find(c => getCountryCode(c) === partnerId);
    if (newSelectedCountry) {
      onCountrySelect(newSelectedCountry);
      // After selecting a new country, reset the panel to the clean "peek" state
      setPanelState('peek'); 
    }
  };
  
  const closePanel = () => {
    setPanelState('closed');
    // Ensure the parent component knows the selection has been cleared
    onClose(); 
  };
  
  // --- Responsive and Interaction Logic ---
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const checkIfMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  // Updated drag handler for the three-state system
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const dragThreshold = 50;
    const velocityThreshold = 300;

    if (panelState === 'expanded') {
      if (info.offset.y > dragThreshold || info.velocity.y > velocityThreshold) {
        setPanelState('peek'); // Drag down from expanded state -> collapse to peek view
      }
    } else if (panelState === 'peek') {
      if (info.offset.y < -dragThreshold || info.velocity.y < -velocityThreshold) {
        setPanelState('expanded'); // Drag up from peek state -> expand
      } else if (info.offset.y > dragThreshold || info.velocity.y > velocityThreshold) {
        closePanel(); // Drag down from peek state -> close completely
      }
    }
  };

  // --- Helper functions for rendering ---
  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getConflictTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'civil_war': 'Civil War', 'international': 'International',
      'insurgency': 'Insurgency', 'border_dispute': 'Border Dispute',
      'other': 'Other'
    };
    return labels[type] || type;
  };

  // --- Framer Motion Animation Variants ---
  const PEEK_HEIGHT = '6rem'; // 96px - height of the "peek" view
  const panelVariants = {
    closed: { y: '100%' },
    peek: { y: `calc(100% - ${PEEK_HEIGHT})` },
    expanded: { y: '30vh' }, // Opens to 70% of the screen height (100vh - 30vh)
  };

  const panelBaseClasses = "fixed md:absolute bg-white/90 dark:bg-gray-900/90 shadow-2xl backdrop-blur-md border border-gray-200 dark:border-white/10 z-50 flex flex-col";
  const mobileClasses = "bottom-0 left-0 right-0 w-full h-full rounded-t-2xl"; // Height is now controlled by variants
  const desktopClasses = "top-4 right-4 w-80 max-h-[calc(100%-2rem)] rounded-lg";

  return (
    <AnimatePresence>
      {panelState !== 'closed' && selectedCountry && countryData && (
        <>
          {/* Mobile overlay - only appears when fully expanded to not block the map */}
          {isMobile && panelState === 'expanded' && (
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPanelState('peek')} // Tapping overlay collapses to peek state
            />
          )}
          
          <motion.div
            className={`${panelBaseClasses} ${isMobile ? mobileClasses : desktopClasses}`}
            initial={isMobile ? 'closed' : { opacity: 0, x: 50 }}
            animate={isMobile ? panelState : { opacity: 1, x: 0 }}
            exit={isMobile ? 'closed' : { opacity: 0, x: 50 }}
            variants={isMobile ? panelVariants : {}}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            // Enable drag-to-interact functionality only on mobile
            {...(isMobile ? {
                drag: "y",
                dragConstraints: { top: 0 },
                onDragEnd: handleDragEnd
            } : {})}
          >
            {/* --- Panel Header (Always Visible in Peek & Expanded states) --- */}
            <div 
              role="button"
              tabIndex={0}
              aria-expanded={panelState === 'expanded'}
              className="p-4 flex-shrink-0 cursor-grab active:cursor-grabbing"
              onClick={() => isMobile && panelState === 'peek' && setPanelState('expanded')}
              onKeyDown={(e) => {
                if (isMobile && panelState === 'peek' && (e.key === 'Enter' || e.key === ' ')) {
                  setPanelState('expanded');
                }
              }}
            >
              {isMobile && (
                <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 dark:bg-gray-600 mb-4" />
              )}
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">{getCountryName(selectedCountry)}</h2>
                <button 
                  onClick={(e) => { e.stopPropagation(); closePanel(); }} 
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 rounded-full p-1 transition-colors"
                  aria-label="Close panel"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* --- Scrollable Detailed Content (Only visible in Expanded state) --- */}
            <div className="flex-grow space-y-6 overflow-y-auto px-4 pb-4 scrollbar-thin scrollbar-thumb-gray-600/50 hover:scrollbar-thumb-gray-500/50 scrollbar-track-transparent">
              {relevantConflicts.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-amber-500 mb-2 uppercase tracking-wider">Active Conflicts</h3>
                  <div className="space-y-3">
                    {relevantConflicts.map((conflict) => (
                      <div key={conflict.id} className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium text-gray-900 dark:text-white">{conflict.name}</h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${getIntensityColor(conflict.intensity)} bg-opacity-20`}>
                            {conflict.intensity.charAt(0).toUpperCase() + conflict.intensity.slice(1)} Intensity
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                          {getConflictTypeLabel(conflict.type)} • Since {conflict.startYear}
                        </div>
                        <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                          {conflict.description}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {conflict.countries
                            .filter(code => code !== countryId)
                            .map(code => {
                              const country = countries.find(c => getCountryCode(c) === code);
                              return country ? (
                                <button 
                                  key={code}
                                  type="button"
                                  className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
                                  onClick={() => handleItemClick(code)}
                                >
                                  {getCountryName(country)}
                                </button>
                              ) : null;
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {friendlyRelations.length > 0 && (
                <RelationList
                  title="Top Allies"
                  titleColor="text-green-400"
                  relations={friendlyRelations}
                  relationshipData={relationshipData}
                  onItemClick={handleItemClick}
                />
              )}

              {hostileRelations.length > 0 && (
                <RelationList
                  title="Top Adversaries"
                  titleColor="text-red-400"
                  relations={hostileRelations}
                  relationshipData={relationshipData}
                  onItemClick={handleItemClick}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const InfoPanel = memo(InfoPanelInternal);
export default InfoPanel;