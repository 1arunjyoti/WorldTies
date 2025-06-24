// src/components/Sidebar.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Feature } from 'geojson';
import SearchBar from './SearchBar';
import { getCountryCode, getCountryName } from '../Utils/Format_country_name';

interface SidebarProps {
  countries: Feature[];
  selectedCountry: Feature | null;
  onCountrySelect: (country: Feature | null) => void;
  alliances: { [key: string]: string[] };
  selectedAlliance: string | null;
  onAllianceSelect: (alliance: string | null) => void;
  projectionName: 'geoMercator' | 'geoOrthographic';
  onProjectionChange: (name: 'geoMercator' | 'geoOrthographic') => void;
}

// Variants for the list animation
const listVariants = {
  open: {
    transition: { staggerChildren: 0.03, delayChildren: 0.2 }
  },
  closed: {
    transition: { staggerChildren: 0.02, staggerDirection: -1 }
  }
};

const itemVariants = {
  open: {
    y: 0,
    opacity: 1,
    transition: {
      y: { stiffness: 1000, velocity: -100 }
    }
  },
  closed: {
    y: 20,
    opacity: 0,
    transition: {
      y: { stiffness: 1000 }
    }
  }
};

// Variants to control the sidebar and button animations together
const sidebarAnimationVariants = {
  open: { width: 288, transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] as const } },
  closed: { width: 0, transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] as const } }
};

const buttonAnimationVariants = {
  // Button position animation
  open: { left: 288, transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] as const } },
  closed: { left: 0, transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] as const } }
};

const iconAnimationVariants = {
  // Icon rotation animation
  open: { rotate: 180, transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] as const } },
  closed: { rotate: 0, transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] as const } }
};

const ProjectionSwitcher: React.FC<{
  projectionName: 'geoMercator' | 'geoOrthographic';
  onProjectionChange: (name: 'geoMercator' | 'geoOrthographic') => void;
}> = ({ projectionName, onProjectionChange }) => {
  return (
    <div className="p-4 border-b border-gray-200 dark:border-slate-800/50">
      <label htmlFor="projection-select" className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-2">
        Map Projection
      </label>
      <select
        id="projection-select"
        value={projectionName}
        onChange={(e) => onProjectionChange(e.target.value as 'geoMercator' | 'geoOrthographic')}
        className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
      >
        <option value="geoMercator">Mercator</option>
        <option value="geoOrthographic">Orthographic</option>
      </select>
    </div>
  );
};

const AllianceFilter: React.FC<{
  alliances: { [key: string]: string[] };
  selectedAlliance: string | null;
  onAllianceSelect: (alliance: string | null) => void;
}> = ({ alliances, selectedAlliance, onAllianceSelect }) => {
  const allianceNames = Object.keys(alliances).sort();

  return (
    <div className="p-4 border-b border-gray-200 dark:border-slate-800/50">
      <label htmlFor="alliance-select" className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-2">
        Filter by Alliance
      </label>
      <select
        id="alliance-select"
        value={selectedAlliance || ''}
        onChange={(e) => onAllianceSelect(e.target.value || null)}
        className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
      >
        <option value="">-- Select Alliance --</option>
        {allianceNames.map(name => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({
  countries,
  selectedCountry,
  onCountrySelect,
  alliances,
  selectedAlliance,
  onAllianceSelect,
  projectionName,
  onProjectionChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredCountries = useMemo(() => {
    let countriesToShow = countries;

    if (selectedAlliance && alliances[selectedAlliance]) {
      const memberCodes = new Set(alliances[selectedAlliance]);
      countriesToShow = countries.filter(c => memberCodes.has(getCountryCode(c) ?? ''));
    }

    return countriesToShow
      .filter(c => c.properties?.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.properties?.name.localeCompare(b.properties?.name));
  }, [countries, searchTerm, selectedAlliance, alliances]);

  const selectedCountryCode = getCountryCode(selectedCountry);

  // Effect to reset focus when the list changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchTerm, selectedAlliance]);

  // Effect for keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isSearchFocused = document.activeElement === searchInputRef.current;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (isSearchFocused) {
          if (filteredCountries.length > 0) {
            setFocusedIndex(0);
            searchInputRef.current?.blur();
          }
        } else {
          setFocusedIndex(prevIndex =>
            prevIndex < filteredCountries.length - 1 ? prevIndex + 1 : prevIndex
          );
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (focusedIndex === 0) {
          setFocusedIndex(-1);
          searchInputRef.current?.focus();
        } else if (focusedIndex > 0) {
          setFocusedIndex(prevIndex => prevIndex - 1);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (isSearchFocused && filteredCountries.length > 0) {
          onCountrySelect(filteredCountries[0]);
        } else if (focusedIndex >= 0) {
          onCountrySelect(filteredCountries[focusedIndex]);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [filteredCountries, focusedIndex, onCountrySelect]);

  // Effect to scroll the focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const focusedItem = listRef.current.children[focusedIndex] as HTMLLIElement;
      if (focusedItem) {
        focusedItem.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [focusedIndex]);

  return (
    <div className="relative h-full flex-shrink-0">
      <motion.button
        aria-label="Toggle Sidebar"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden md:flex absolute top-1/2 -translate-y-1/2 w-8 h-20 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border-y border-r border-slate-200 dark:border-slate-700 rounded-r-xl shadow-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center z-30 transition-colors duration-300"
        animate={isCollapsed ? 'closed' : 'open'}
        variants={buttonAnimationVariants}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          variants={iconAnimationVariants}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m13 5 7 7-7 7M5 5l7 7-7 7" />
        </motion.svg>
      </motion.button>
      
      <motion.aside
        initial={false}
        animate={isCollapsed ? 'closed' : 'open'}
        variants={sidebarAnimationVariants}
        className="bg-white dark:bg-slate-900/95 backdrop-blur-sm border-r border-gray-200 dark:border-slate-800/50 shadow-2xl flex flex-col h-full z-20 overflow-hidden"
      >
        <div className="h-full flex flex-col w-[288px] pt-15 md:pt-0">
          <ProjectionSwitcher
            projectionName={projectionName}
            onProjectionChange={onProjectionChange}
          />
          <AllianceFilter
            alliances={alliances}
            selectedAlliance={selectedAlliance}
            onAllianceSelect={onAllianceSelect}
          />
          <SearchBar ref={searchInputRef} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          <motion.nav 
            variants={listVariants}
            className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-transparent scrollbar-thumb-transparent hover:scrollbar-thumb-slate-600"
          >
            <ul ref={listRef}>
              {filteredCountries.map((country, index) => {
                const isSelected = getCountryCode(country) === selectedCountryCode;
                const isFocused = index === focusedIndex;
                
                let buttonClass = 'w-full text-left px-4 py-2 text-sm transition-all duration-200 ease-in-out border-l-4 ';
                if (isSelected) {
                  buttonClass += 'bg-blue-500/20 dark:bg-blue-600/30 text-blue-800 dark:text-white border-blue-400';
                } else if (isFocused) {
                  buttonClass += 'bg-gray-300 dark:bg-slate-700/70 border-slate-500';
                } else {
                  buttonClass += 'text-gray-600 dark:text-slate-300 border-transparent hover:bg-gray-200 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:hover:text-white hover:border-slate-500';
                }

                // Generate a unique key using country code or fallback to index and name
                const countryCode = getCountryCode(country);
                const uniqueKey = countryCode || `country-${index}-${country.properties?.name || 'unknown'}`;
                
                return (
                  <motion.li key={uniqueKey} variants={itemVariants}>
                    <button
                      onClick={() => onCountrySelect(country)}
                      className={buttonClass}
                    >
                      {getCountryName(country)}
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          </motion.nav>
        </div>
      </motion.aside>
    </div>
  );
};

export default Sidebar;