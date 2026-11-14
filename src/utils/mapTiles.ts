/**
 * Basemap definitions powered by Mapbox Styles API (proxied server-side via /api/mapbox/tiles/*
 * so MAPBOX_TOKEN remains strictly on the server, with automatic OSM/CARTO fallback if unavailable).
 */
export type BasemapId = 'streets' | 'light' | 'dark' | 'satellite';

export interface BasemapDef {
  id: BasemapId;
  label: string;
  shortLabel: string;
  tileUrl: string;
  attribution: string;
  subdomains: string;
  maxZoom: number;
}

const MAPBOX_ATTRIBUTION =
  '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export const BASEMAPS: Record<BasemapId, BasemapDef> = {
  streets: {
    id: 'streets',
    label: 'Mapbox Streets',
    shortLabel: 'Streets',
    tileUrl: '/api/mapbox/tiles/streets/{z}/{x}/{y}',
    attribution: MAPBOX_ATTRIBUTION,
    subdomains: '',
    maxZoom: 20,
  },
  light: {
    id: 'light',
    label: 'Mapbox Light',
    shortLabel: 'Light',
    tileUrl: '/api/mapbox/tiles/light/{z}/{x}/{y}',
    attribution: MAPBOX_ATTRIBUTION,
    subdomains: '',
    maxZoom: 20,
  },
  dark: {
    id: 'dark',
    label: 'Mapbox Dark',
    shortLabel: 'Dark',
    tileUrl: '/api/mapbox/tiles/dark/{z}/{x}/{y}',
    attribution: MAPBOX_ATTRIBUTION,
    subdomains: '',
    maxZoom: 20,
  },
  satellite: {
    id: 'satellite',
    label: 'Mapbox Satellite',
    shortLabel: 'Satellite',
    tileUrl: '/api/mapbox/tiles/satellite/{z}/{x}/{y}',
    attribution: MAPBOX_ATTRIBUTION,
    subdomains: '',
    maxZoom: 20,
  },
};

export const BASEMAP_ORDER: BasemapId[] = ['streets', 'light', 'dark', 'satellite'];

export function defaultBasemap(darkMode: boolean): BasemapId {
  return darkMode ? 'dark' : 'streets';
}

/** External "open in maps" link (OpenStreetMap, free, no key). */
export function osmDirectionsUrl(lat: number, lng: number, zoom = 16): string {
  return `https://www.openstreetmap.org/?mlat=${lat.toFixed(5)}&mlon=${lng.toFixed(5)}#map=${zoom}/${lat.toFixed(5)}/${lng.toFixed(5)}`;
}

/** Convert lat/lng to slippy-map tile coordinates (for static thumbnails). */
export function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y };
}

/** Static single-tile thumbnail URL via our Mapbox tile proxy for ward/incident previews. */
export function staticTileUrl(lat: number, lng: number, zoom: number, darkMode: boolean): string {
  const { x, y } = latLngToTile(lat, lng, zoom);
  const style = darkMode ? 'dark' : 'streets';
  return `/api/mapbox/tiles/${style}/${zoom}/${x}/${y}`;
}
