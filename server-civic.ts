// CivicRewards pilot: server-side only bridge to the real Signal Desk civic
// backend (Buildvessel/signal-desk-v4, branch feat/civic-intake-outbox).
// CIVIC_SERVICE_KEY never reaches the browser — every call here runs on the
// server (Express locally via server.ts, Vercel functions via api/civic/*.ts
// which both import this module).
//
// Ward 115 pilot only (Thami, Nov 2026): the DA has not approved wider
// rollout, so any address resolving outside Ward 115 is refused, and every
// submission is forced isTest=true server-side regardless of what the client
// sends — there is no live DA-approved recipient/councillor data yet, so
// nothing submitted through this app can be a real resident case.

const CIVIC_BACKEND_BASE_URL = process.env.CIVIC_BACKEND_BASE_URL ?? 'https://www.signaldesk.co.za';
const CIVIC_SERVICE_KEY = process.env.CIVIC_SERVICE_KEY;
const CIVIC_ACTOR_PREFIX = 'civicrewardsapp';

export class CivicProxyError extends Error {
  status: number;
  code: string;
  constructor(code: string, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

function actorId(rawId: string): string {
  // Matches signal-desk-v4's authorize() pattern: [A-Za-z0-9_:@.+-]{3,160}.
  const cleaned = `${CIVIC_ACTOR_PREFIX}:${rawId}`.replace(/[^A-Za-z0-9_:@.+-]/g, '').slice(0, 160);
  return cleaned.length >= 3 ? cleaned : `${CIVIC_ACTOR_PREFIX}:anon-${Date.now()}`;
}

async function civicFetch(path: string, actor: string, body: unknown) {
  if (!CIVIC_SERVICE_KEY) {
    throw new CivicProxyError('civic_backend_not_configured', 503);
  }
  const res = await fetch(`${CIVIC_BACKEND_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-civic-service-key': CIVIC_SERVICE_KEY,
      'x-civic-actor-id': actor,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new CivicProxyError(data?.error ?? 'civic_backend_error', res.status);
  }
  return data;
}

// Free, keyless geocoder (OpenStreetMap Nominatim) — deliberately not a paid
// provider, so this pilot never needs a new spend decision. Usage-policy
// compliant: identifying User-Agent, one request per submission (not typed-
// as-you-go), no caching requirement at this volume. Swap for a paid
// provider later via GEOCODE_PROVIDER if accuracy becomes a problem.
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const query = `${address}, Johannesburg, South Africa`;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=za&q=${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': 'CivicRewardsApp-Pilot/1.0 (civicrewards.co.za)' }, signal: AbortSignal.timeout(8_000) },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ lat: string; lon: string }>;
    const first = rows[0];
    if (!first) return null;
    return { lat: Number(first.lat), lng: Number(first.lon) };
  } catch {
    return null;
  }
}

export type ResolvedWard = {
  wardCode: string;
  wardNumber: string;
  municipalityName: string;
  councillorName: string | null;
  sourceUrl: string;
  geometry: unknown;
};

export async function resolveWardForAddress(
  address: string,
  actorRawId: string,
): Promise<{ ward: ResolvedWard; lat: number; lng: number }> {
  if (!address?.trim()) throw new CivicProxyError('address_required');
  const geo = await geocodeAddress(address.trim());
  if (!geo) throw new CivicProxyError('address_not_found', 422);
  const data = await civicFetch('/api/civic/resolve-ward', actorId(actorRawId), { latitude: geo.lat, longitude: geo.lng });
  const ward = data.ward as ResolvedWard;
  if (ward.wardNumber !== '115') {
    throw new CivicProxyError('pilot_limited_to_ward_115', 422);
  }
  return { ward, lat: geo.lat, lng: geo.lng };
}

export type SubmitReportInput = {
  idempotencyKey: string;
  municipalReference: string;
  name: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  description: string;
  actorRawId: string;
};

export async function submitCivicReport(input: SubmitReportInput) {
  if (!/test/i.test(input.description)) {
    throw new CivicProxyError('test_description_required');
  }
  return civicFetch('/api/civic/reports', actorId(input.actorRawId), {
    idempotencyKey: input.idempotencyKey,
    municipalReference: input.municipalReference,
    name: input.name,
    phone: input.phone,
    address: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
    category: input.category,
    description: input.description,
    consentToShare: true,
    // Hardcoded server-side, never trusts a client-supplied value — see file
    // header. This pilot has no live DA-approved recipient data yet.
    isTest: true,
  });
}
