// Vercel serverless function — see server-civic.ts for the shared logic and
// pilot scope notes (Ward 115 only, isTest forced true, CIVIC_SERVICE_KEY
// server-side only).
import { randomUUID } from 'node:crypto';
import { resolveWardForAddress, submitCivicReport, CivicProxyError } from '../../server-civic';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const body = req.body as {
      name?: string; phone?: string; address?: string; category?: string;
      description?: string; municipalReference?: string; actorId?: string;
    };
    if (!body.name || !body.phone || !body.address || !body.category || !body.description || !body.municipalReference) {
      return res.status(400).json({ error: 'missing_required_field' });
    }
    const actorRawId = body.actorId || req.headers['x-forwarded-for'] || 'unknown';
    const { ward, lat, lng } = await resolveWardForAddress(body.address, actorRawId);
    const result = await submitCivicReport({
      idempotencyKey: randomUUID(),
      municipalReference: body.municipalReference,
      name: body.name,
      phone: body.phone,
      address: body.address,
      latitude: lat,
      longitude: lng,
      category: body.category,
      description: body.description,
      actorRawId,
    });
    return res.json({ ...result, ward });
  } catch (err) {
    const code = err instanceof CivicProxyError ? err.code : 'civic_service_unavailable';
    const status = err instanceof CivicProxyError ? err.status : 503;
    return res.status(status).json({ error: code });
  }
}
