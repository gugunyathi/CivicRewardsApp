// api/mapbox/tiles/[style]/[z]/[x]/[y].ts – Vercel serverless tile proxy
// NOTE: explicit 4-segment dynamic route. A [...slug] catch-all file only
// matched a single path segment on Vercel (multi-segment tile URLs 404'd),
// so the tile path is declared segment by segment instead.
const MAPBOX_STYLE_MAP: Record<string, { mapboxId: string; fallbackUrl: (z: number, x: number, y: number) => string }> = {
  streets: {
    mapboxId: 'mapbox/streets-v12',
    fallbackUrl: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
  },
  light: {
    mapboxId: 'mapbox/light-v11',
    fallbackUrl: (z, x, y) => `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`,
  },
  dark: {
    mapboxId: 'mapbox/dark-v11',
    fallbackUrl: (z, x, y) => `https://a.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`,
  },
  satellite: {
    mapboxId: 'mapbox/satellite-streets-v12',
    fallbackUrl: (z, x, y) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
  },
};

export default async function handler(req: any, res: any) {
  const styleKey = String(req.query?.style || '').toLowerCase();
  const z = Number.parseInt(req.query?.z, 10);
  const x = Number.parseInt(req.query?.x, 10);
  const y = Number.parseInt(req.query?.y, 10);

  const styleCfg = MAPBOX_STYLE_MAP[styleKey];

  if (
    !styleCfg ||
    !Number.isInteger(z) ||
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    z < 0 ||
    z > 22 ||
    x < 0 ||
    y < 0
  ) {
    res.status(400).json({ error: 'Invalid tile parameters.' });
    return;
  }

  const token = process.env.MAPBOX_TOKEN?.trim() || process.env.VITE_MAPBOX_TOKEN?.trim();
  const targetUrl = token
    ? `https://api.mapbox.com/styles/v1/${styleCfg.mapboxId}/tiles/256/${z}/${x}/${y}@2x?access_token=${encodeURIComponent(token)}`
    : styleCfg.fallbackUrl(z, x, y);

  const fetchTile = async (url: string) => {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'CivicRewards/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      throw new Error(`Tile HTTP ${r.status}`);
    }
    const contentType = r.headers.get('content-type') || 'image/png';
    const buf = Buffer.from(await r.arrayBuffer());
    return { contentType, buf };
  };

  try {
    const tile = await fetchTile(targetUrl);
    res.setHeader('Content-Type', tile.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('X-Map-Provider', token ? 'mapbox' : 'osm-fallback');
    res.send(tile.buf);
  } catch (_err) {
    if (token) {
      try {
        const fallback = await fetchTile(styleCfg.fallbackUrl(z, x, y));
        res.setHeader('Content-Type', fallback.contentType);
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        res.setHeader('X-Map-Provider', 'osm-fallback');
        res.send(fallback.buf);
        return;
      } catch {
        // fall through
      }
    }
    res.status(502).json({ error: 'Failed to fetch map tile.' });
  }
}
