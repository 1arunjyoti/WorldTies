import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  selectCountry,
  selectAlliance,
  setProjection,
  selectSelectedCountry,
  selectSelectedAlliance,
  selectProjectionType,
} from '../store/slices/uiSlice';
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

  // Read state from URL on initial load
  useEffect(() => {
    if (!countries || countries.length === 0) return;

    const countryId = searchParams.get('country');
    const allianceName = searchParams.get('alliance');
    const projectionType = searchParams.get('projection');

    if (countryId) {
      const countryToSelect = countries.find((c) => getCountryCode(c) === countryId);
      if (countryToSelect) {
        dispatch(selectCountry(countryToSelect));
      }
    } else if (allianceName) {
      dispatch(selectAlliance(allianceName));
    }

    if (projectionType === 'geoMercator' || projectionType === 'geoOrthographic') {
      dispatch(setProjection(projectionType));
    }
  }, [countries, dispatch, searchParams]);
};