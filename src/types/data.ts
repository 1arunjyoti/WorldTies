// src/types/data.ts

export interface CountryData {
  name: string;
  relations: { [partnerCode: string]: number };
}

export interface RelationshipData {
  [key: string]: CountryData;
}
