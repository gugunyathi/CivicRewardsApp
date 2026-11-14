// api/health.ts – Vercel serverless function
export default function handler(req: any, res: any) {
  res.json({
    ok: true,
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    hasMapboxToken: Boolean(process.env.MAPBOX_TOKEN || process.env.VITE_MAPBOX_TOKEN),
  });
}

