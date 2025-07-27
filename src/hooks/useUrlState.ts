import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCountry, selectAlliance, setProjection, selectSelectedCountry, selectSelectedAlliance, selectProjectionType } from '../store/slices/uiSlice';
import type { Feature } from 'geojson';
import { getCountryCode } from '../Utils/Format_country_name';

export const useUrlState = (countries: Feature[] = []) => {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedCountry = useAppSelector(selectSelectedCountry);
  const selectedAlliance = useAppSelector(selectSelectedAlliance);
  const projection = useAppSelector(selectProjectionType);

  // Update URL from state
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCountry) {
            const countryCode = getCountryCode(selectedCountry);
      if (countryCode) {
        params.set('country', countryCode);
      }
    }
    if (selectedAlliance) {
      params.set('alliance', selectedAlliance);
    }
    if (projection) {
      params.set('projection', projection);
    }
    setSearchParams(params, { replace: true });
  }, [selectedCountry, selectedAlliance, projection, setSearchParams]);

  // Track if we've processed the initial URL parameters
  const hasProcessedInitialUrl = useRef(false);

  // This effect handles initial URL parameters when the component mounts and when countries are loaded
  useEffect(() => {
    // If we don't have countries yet or we've already processed the URL, do nothing
    if (!countries.length || hasProcessedInitialUrl.current) return;
    
    const countryId = searchParams.get('country');
    const allianceName = searchParams.get('alliance');
    const projectionType = searchParams.get('projection');
    
    // Mark that we've processed the URL to prevent running this again
    hasProcessedInitialUrl.current = true;

    // Process projection first as it doesn't conflict with other selections
    if (projectionType === 'geoMercator' || projectionType === 'geoOrthographic') {
      dispatch(setProjection(projectionType));
    }

    // Process country/alliance selection
    if (countryId) {
      const countryToSelect = countries.find(c => getCountryCode(c) === countryId);
      if (countryToSelect) {
        // Clear any existing alliance selection when selecting a country
        dispatch(selectAlliance(null));
        dispatch(selectCountry(countryToSelect));
      }
    } else if (allianceName) {
      // Clear any existing country selection when selecting an alliance
      dispatch(selectCountry(null));
      dispatch(selectAlliance(allianceName));
    }
  }, [countries, dispatch, searchParams]);
};
