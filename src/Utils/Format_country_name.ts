// src/utils/Format_country_name.ts
import type { Feature } from 'geojson';

// This map links the numeric ISO 3166-1 code from the TopoJSON 'id' field
// to the 3-letter ISO A3 code we use in our relationships.json.
// You would need to expand this list for all countries you support.
const isoNumericToAlpha3: { [key: string]: string } = {
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

/**
 * Extracts the 3-letter ISO A3 country code from a GeoJSON feature
 * by converting its numeric ID.
 * @param countryFeature The GeoJSON feature representing a country.
 * @returns The 3-letter ISO A3 code (e.g., "USA") or null if not found.
 */
export function getCountryCode(countryFeature: Feature | null | undefined): string | null {
  if (!countryFeature) {
    return null;
  }

  const props = countryFeature.properties as { [key: string]: any };

  // 1. First check for special cases that need to be treated separately
  if (props?.name === 'Kosovo') return 'XKX';
  if (props?.name === 'Somaliland') return 'SOL';
  if (props?.name === 'Norway') return 'NOR';
  if (props?.name === 'France') return 'FRA';

  // 2. Use ISO A3 code if available and valid
  if (props?.iso_a3 && typeof props.iso_a3 === 'string' && props.iso_a3.length === 3) {
    // Special case for France's overseas territories
    if (props.iso_a3 === 'FRA' && props.name !== 'France') {
      return `${props.iso_a3}-${props.name.replace(/\s+/g, '')}`.toUpperCase();
    }
    return props.iso_a3;
  }

  // 3. Fallback to ADM0_A3 code if available
  if (props?.adm0_a3 && typeof props.adm0_a3 === 'string' && props.adm0_a3.length === 3) {
    return props.adm0_a3;
  }

  // 4. Finally, try the numeric ISO code mapping
  if (props?.iso_n3) {
    const numericId = String(props.iso_n3);
    if (isoNumericToAlpha3[numericId]) {
      return isoNumericToAlpha3[numericId];
    }
  }

  return null;
}

/**
 * Safely extracts the display name from a GeoJSON feature.
 * @param countryFeature The GeoJSON feature representing a country.
 * @returns The country's common name or a default string.
 */
export function getCountryName(countryFeature: Feature | null | undefined): string {
  // The 'name' is in the properties object
  return countryFeature?.properties?.name || 'Unknown Country';
}