// src/utils/Format_country_name.ts
import type { Feature } from 'geojson';

import countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';

countries.registerLocale(en);

// Define a more specific type for the properties we expect on a country feature
export interface CountryFeatureProperties {
  name?: string;
  iso_a3?: string;
  adm0_a3?: string;
  iso_n3?: string;
}

// This map links the numeric ISO 3166-1 code from the TopoJSON 'id' field
// to the 3-letter ISO A3 code we use in our relationships.json.
// You would need to expand this list for all countries you support.
/* const isoNumericToAlpha3: { [key: string]: string } = {
  '840': 'USA',
  '124': 'CAN',
  '156': 'CHN',
  '643': 'RUS',
  '276': 'DEU',
  '826': 'GBR',
  '250': 'FRA',
  '356': 'IND',
  '586': 'PAK',
  '392': 'JPN',
  '804': 'UKR',
  '112': 'BLR',
  '484': 'MEX',
  '360': 'IDN', // Indonesia
  // Add other countries as needed...
};
*/

// A map for unofficial codes or names not in the standard
const nameToCodeOverrides: { [key: string]: string } = {
  'Kosovo': 'XKX', // Kosovo has a user-assigned code
  'Somaliland': 'SOL', // Unofficial but commonly used code
  'N. Cyprus': 'CYP-NORTH' // Example of a custom code
};

export function getCountryCode(countryFeature: Feature | null | undefined): string | null {
  if (!countryFeature?.properties) {
    return null;
  }

  const props = countryFeature.properties as CountryFeatureProperties;
  const { name, iso_a3, adm0_a3, iso_n3 } = props;

  // 1. Check overrides first for special cases
  if (name && nameToCodeOverrides[name]) {
    return nameToCodeOverrides[name];
  }

  // 2. Use ISO A3 code if available and valid
  if (iso_a3 && countries.isValid(iso_a3)) {
     // Your excellent French territory logic still applies
     if (iso_a3 === 'FRA' && name && name !== 'France') {
        return `FRA-${name.replace(/\s+/g, '')}`.toUpperCase();
     }
    return iso_a3;
  }

  // 3. Fallback to ADM0_A3 code
  if (adm0_a3 && countries.isValid(adm0_a3)) {
    return adm0_a3;
  }

  // 4. Fallback to converting from numeric code (iso_n3)
  if (iso_n3) {
    const alpha3 = countries.numericToAlpha3(String(iso_n3));
    if (alpha3) return alpha3;
  }

  // 5. Fallback to converting from the country name itself
  if (name) {
      const alpha3 = countries.getAlpha3Code(name, 'en');
      if (alpha3) return alpha3;
  }

  return null;
}

export function getCountryName(countryFeature: Feature | null | undefined): string {
  return countryFeature?.properties?.name || 'Unknown Country';
}
