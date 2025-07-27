import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Feature } from 'geojson';

// Define projection types
export type ProjectionType = 'geoMercator' | 'geoOrthographic';

// Define the shape of our UI slice state
interface UIState {
  selectedCountry: Feature | null;
  selectedAlliance: string | null;
  projection: ProjectionType;
  mobileMenuOpen: boolean;
  searchTerm: string;
  sidebarCollapsed: boolean;
  mapRotation: [number, number];
}

// Initial state
const initialState: UIState = {
  selectedCountry: null,
  selectedAlliance: null,
  projection: 'geoMercator',
  mobileMenuOpen: false,
  searchTerm: '',
  sidebarCollapsed: false,
  mapRotation: [20, -20],
};

// Create the slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Select a country (clears alliance selection)
    selectCountry: (state, action: PayloadAction<Feature | null>) => {
      state.selectedCountry = action.payload;
      // Mutual exclusion: selecting a country clears alliance selection
      if (action.payload !== null) {
        state.selectedAlliance = null;
      }
    },
    
    // Select an alliance (clears country selection)
    selectAlliance: (state, action: PayloadAction<string | null>) => {
      state.selectedAlliance = action.payload;
      // Mutual exclusion: selecting an alliance clears country selection
      if (action.payload !== null) {
        state.selectedCountry = null;
      }
    },
    
    // Clear all selections
    clearSelections: (state) => {
      state.selectedCountry = null;
      state.selectedAlliance = null;
    },
    
    // Set map projection
    setProjection: (state, action: PayloadAction<ProjectionType>) => {
      state.projection = action.payload;
    },
    
    // Toggle mobile menu
    toggleMobileMenu: (state) => {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },
    
    // Set mobile menu state explicitly
    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileMenuOpen = action.payload;
    },
    
    // Reset UI state to initial values
    resetUIState: () => initialState,

    // Set search term for filtering countries
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },

    // Toggle sidebar collapsed state
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },

    // Set map rotation for orthographic projection
    setMapRotation: (state, action: PayloadAction<[number, number]>) => {
      state.mapRotation = action.payload;
    },
  },
});

// Export actions
export const {
  selectCountry,
  selectAlliance,
  clearSelections,
  setProjection,
  toggleMobileMenu,
  setMobileMenuOpen,
  resetUIState,
  setSearchTerm,
  toggleSidebar,
  setMapRotation,
} = uiSlice.actions;

// Export the reducer
export default uiSlice.reducer;

// Export selectors
export const selectSelectedCountry = (state: { ui: UIState }) => state.ui.selectedCountry;
export const selectSelectedAlliance = (state: { ui: UIState }) => state.ui.selectedAlliance;
export const selectProjectionType = (state: { ui: UIState }) => state.ui.projection;
export const selectMobileMenuOpen = (state: { ui: UIState }) => state.ui.mobileMenuOpen;
export const selectSearchTerm = (state: { ui: UIState }) => state.ui.searchTerm;
export const selectSidebarCollapsed = (state: { ui: UIState }) => state.ui.sidebarCollapsed;
export const selectMapRotation = (state: { ui: UIState }) => state.ui.mapRotation;

// Composite selectors
export const selectHasActiveSelection = (state: { ui: UIState }) => 
  state.ui.selectedCountry !== null || state.ui.selectedAlliance !== null;

export const selectIsCountrySelected = (state: { ui: UIState }, countryId: string) => 
  state.ui.selectedCountry?.id === countryId;

export const selectIsAllianceSelected = (state: { ui: UIState }, allianceName: string) => 
  state.ui.selectedAlliance === allianceName;
