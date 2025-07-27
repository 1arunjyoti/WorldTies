import { useQuery } from '@tanstack/react-query';
import type { FeatureCollection } from 'geojson';
import type { RelationshipData } from '../types/data';

const fetchWorldMapData = async () => {
  const res = await fetch('/data/world_map_medium.json');
  if (!res.ok) {
    throw new Error('Network response was not ok');
  }
  return res.json() as Promise<FeatureCollection>;
};

const fetchRelationshipsData = async () => {
  const res = await fetch('/data/relationships.json');
  if (!res.ok) {
    throw new Error('Network response was not ok');
  }
  return res.json() as Promise<RelationshipData>;
};

const fetchAlliancesData = async () => {
  const res = await fetch('/data/alliances.json');
  if (!res.ok) {
    throw new Error('Network response was not ok');
  }
  return res.json() as Promise<{ [key: string]: string[] }>;
};

export const useWorldMapData = () => {
  return useQuery({
    queryKey: ['worldMapData'],
    queryFn: fetchWorldMapData,
  });
};

export const useRelationshipsData = (options: { enabled: boolean }) => {
  return useQuery({
    queryKey: ['relationshipsData'],
    queryFn: fetchRelationshipsData,
    ...options,
  });
};

export const useAlliancesData = () => {
  return useQuery({
    queryKey: ['alliancesData'],
    queryFn: fetchAlliancesData,
  });
};
