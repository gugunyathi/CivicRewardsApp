// api/health.ts – Vercel serverless function
import { getStoreMetrics } from '../server-store.js';
import { getAiCapabilitiesStatus } from '../server-ai.js';

export default function handler(_req: any, res: any) {
  res.json({
    ok: true,
    ...getAiCapabilitiesStatus(),
    hasMapboxToken: Boolean(process.env.MAPBOX_TOKEN || process.env.VITE_MAPBOX_TOKEN),
    ...getStoreMetrics(),
  });
}
