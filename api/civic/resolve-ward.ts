// Vercel serverless function — see server-civic.ts for the shared logic and
// pilot scope notes (Ward 115 only, CIVIC_SERVICE_KEY server-side only).
import { resolveWardForAddress, CivicProxyError } from '../../server-civic';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { address, actorId } = req.body as { address?: string; actorId?: string };
    if (!address) return res.status(400).json({ error: 'address_required' });
    const result = await resolveWardForAddress(address, actorId || req.headers['x-forwarded-for'] || 'unknown');
    return res.json(result);
  } catch (err) {
    const code = err instanceof CivicProxyError ? err.code : 'civic_service_unavailable';
    const status = err instanceof CivicProxyError ? err.status : 503;
    return res.status(status).json({ error: code });
  }
}
