// api/ai/status.ts – Vercel serverless function
import { getAiCapabilitiesStatus } from '../../server-ai';

export default function handler(_req: any, res: any) {
  res.json({
    ok: true,
    ...getAiCapabilitiesStatus(),
  });
}
