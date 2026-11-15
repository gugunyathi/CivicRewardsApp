import { SEED_WARDS } from '../data/civicSeedData';
import type { WardRecord } from '../types/civic';

export function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function resolveWardByCoordinates(lat: number, lng: number): { ward: WardRecord; distanceMeters: number } {
  let closest = SEED_WARDS[0];
  let minDistance = haversineDistanceMeters(lat, lng, closest.lat, closest.lng);

  for (const ward of SEED_WARDS.slice(1)) {
    const dist = haversineDistanceMeters(lat, lng, ward.lat, ward.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = ward;
    }
  }

  return { ward: closest, distanceMeters: minDistance };
}

export function resolveWardByQuery(query: string): WardRecord | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  // Check explicit ward number match like "ward 115" or "115"
  const wardNumMatch = q.match(/(?:ward\s*)?(\d{2,3})/);
  if (wardNumMatch) {
    const num = Number(wardNumMatch[1]);
    const byNum = SEED_WARDS.find((w) => w.wardNumber === num);
    if (byNum) return byNum;
  }

  // Score by suburbs, corridors, municipality name, councillor name
  for (const ward of SEED_WARDS) {
    if (ward.suburbs.some((s) => q.includes(s.toLowerCase()) || s.toLowerCase().includes(q))) {
      return ward;
    }
    if (ward.corridors.some((c) => q.includes(c.toLowerCase()) || c.toLowerCase().includes(q))) {
      return ward;
    }
    if (ward.councillor.name.toLowerCase().includes(q)) {
      return ward;
    }
    if (ward.municipalityName.toLowerCase().includes(q) || ward.municipalityCode.toLowerCase() === q) {
      return ward;
    }
  }

  return null;
}

export function getDepotForCategory(ward: WardRecord, categoryId: string): string {
  switch (categoryId) {
    case 'water':
    case 'sanitation':
      return ward.depots.water;
    case 'electricity':
    case 'streetlights':
      return ward.depots.electricity;
    case 'roads':
      return ward.depots.roads;
    case 'waste':
      return ward.depots.waste ?? `${ward.municipalityCode} Solid Waste Depot`;
    case 'parks':
      return `${ward.municipalityCode} City Parks Depot`;
    case 'safety':
      return `${ward.municipalityCode} Metro Police & Emergency`;
    default:
      return `${ward.municipalityName} Customer Care`;
  }
}
