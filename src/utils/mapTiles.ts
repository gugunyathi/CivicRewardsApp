/**
 * Free, keyless basemap providers (OpenStreetMap ecosystem).
 * No API token required — all tiles are free for this app's usage tier.
 * CARTO basemaps + OpenStreetMap standard + Esri World Imagery (free tile endpoint).
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

export const BASEMAPS: Record<BasemapId, BasemapDef> = {
  streets: {
    id: 'streets',
    label: 'OSM Streets',
    shortLabel: 'Streets',
    tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: 'abc',
    maxZoom: 19,
  },
  light: {
    id: 'light',
    label: 'Carto Light',
    shortLabel: 'Light',
    tileUrl: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
  },
  dark: {
    id: 'dark',
    label: 'Carto Dark',
    shortLabel: 'Dark',
    tileUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
  },
  satellite: {
    id: 'satellite',
    label: 'Esri Satellite',
    shortLabel: 'Satellite',
    tileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    subdomains: '',
    maxZoom: 19,
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

/** Static single-tile thumbnail URL (CARTO, free) for lightweight map previews. */
export function staticTileUrl(lat: number, lng: number, zoom: number, darkMode: boolean): string {
  const { x, y } = latLngToTile(lat, lng, zoom);
  const style = darkMode ? 'dark_all' : 'rastertiles/voyager';
  const sub = 'abcd'[Math.abs(x + y) % 4];
  return `https://${sub}.basemaps.cartocdn.com/${style}/${zoom}/${x}/${y}.png`;
}
