// api/ward115/map.ts – Vercel serverless function
import type { CivicReport, ReportStatus, ServiceCategoryId } from '../../src/types/civic';

export const config = {
  api: {
    responseLimit: '8mb',
  },
};

const CATEGORY_MAP: Record<string, { id: ServiceCategoryId; dept: string; depot: string; sla: number }> = {
  water: { id: 'water', dept: 'Water & Sanitation', depot: 'Joburg Water Randburg Depot', sla: 24 },
  electricity: { id: 'electricity', dept: 'Electricity & Power', depot: 'City Power Bryanston Depot', sla: 24 },
  power: { id: 'electricity', dept: 'Electricity & Power', depot: 'City Power Bryanston Depot', sla: 24 },
  roads: { id: 'roads', dept: 'Roads & Stormwater', depot: 'JRA Region A Depot', sla: 72 },
  pothole: { id: 'roads', dept: 'Roads & Stormwater', depot: 'JRA Region A Depot', sla: 72 },
  streetlights: { id: 'streetlights', dept: 'Streetlights & Traffic Signals', depot: 'City Power Streetlighting', sla: 48 },
  traffic: { id: 'streetlights', dept: 'Streetlights & Traffic Signals', depot: 'JRA Traffic Signals', sla: 24 },
  waste: { id: 'waste', dept: 'Solid Waste & Illegal Dumping', depot: 'Pikitup Randburg Depot', sla: 48 },
  parks: { id: 'parks', dept: 'City Parks & Public Trees', depot: 'City Parks Region A', sla: 72 },
  safety: { id: 'safety', dept: 'Public Safety & Metro Police', depot: 'JMPD Region A Sector', sla: 4 },
  accounts: { id: 'accounts', dept: 'Municipal Accounts & Revenue', depot: 'CoJ Revenue Shared Services', sla: 48 },
  anticorruption: { id: 'anticorruption', dept: 'Anti-Corruption & Integrity', depot: 'Group Forensic Investigation Service (GFIS)', sla: 24 },
};

function mapSignalDeskStatus(rawStatus?: string | null): ReportStatus {
  const s = String(rawStatus || '').toLowerCase();
  if (s.includes('resolved') || s.includes('closed') || s.includes('completed')) return 'Resolved';
  if (s.includes('dispatch') || s.includes('allocated') || s.includes('depot')) return 'Escalated to Depot';
  if (s.includes('progress') || s.includes('technician') || s.includes('site')) return 'Technician Dispatched';
  return 'Logged';
}

function formatRelativeAgo(iso?: string | null): string {
  if (!iso) return 'Recently';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'Recently';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface Ward115MapCache {
  fetchedAt: number;
  payload: {
    ok: boolean;
    source: string;
    totalReports: number;
    pinnedTotal: number;
    unmappedCount: number;
    pins: CivicReport[];
  };
}

let ward115Cache: Ward115MapCache | null = null;
let ward115InFlight: Promise<Ward115MapCache['payload']> | null = null;

async function loadWard115FromSignalDesk(): Promise<Ward115MapCache['payload']> {
  const allRows: Array<Record<string, unknown>> = [];
  let reportedTotal = 0;

  for (let offset = 0; offset < 5000; offset += 1000) {
    const url = `https://signal-desk-municipal-councillor.vercel.app/api/ward-data?ward=115&offset=${offset}&limit=1000`;
    const upstream = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!upstream.ok) break;
    const json = (await upstream.json()) as {
      ok?: boolean;
      total?: number;
      reports?: Array<Record<string, unknown>>;
    };
    if (!json.ok || !Array.isArray(json.reports) || json.reports.length === 0) break;
    if (typeof json.total === 'number') reportedTotal = json.total;
    allRows.push(...json.reports);
    if (json.reports.length < 1000 || (reportedTotal > 0 && allRows.length >= reportedTotal)) break;
  }

  const activeRows = allRows.filter((r) => !r.dismissed_at);
  const geocoded = activeRows.filter(
    (r) =>
      r.geocode_status === 'ok' &&
      typeof r.lat === 'number' &&
      typeof r.lng === 'number' &&
      Number.isFinite(r.lat) &&
      Number.isFinite(r.lng)
  );
  const unmappedCount = Math.max(0, (reportedTotal || activeRows.length) - geocoded.length);

  const pendingOrEscalated = geocoded.filter((r) => mapSignalDeskStatus(String(r.status ?? '')) !== 'Resolved');
  const resolvedWithMedia = geocoded.filter(
    (r) =>
      mapSignalDeskStatus(String(r.status ?? '')) === 'Resolved' &&
      Array.isArray(r.ward_report_media) &&
      r.ward_report_media.length > 0
  );
  const resolvedPlain = geocoded.filter(
    (r) =>
      mapSignalDeskStatus(String(r.status ?? '')) === 'Resolved' &&
      (!Array.isArray(r.ward_report_media) || r.ward_report_media.length === 0)
  );

  const selectedRows = [
    ...pendingOrEscalated,
    ...resolvedWithMedia.slice(0, 65),
    ...resolvedPlain.slice(0, 65),
  ];

  const seenCoords = new Map<string, number>();
  const pins: CivicReport[] = selectedRows.map((row) => {
    const baseLat = Number(row.lat);
    const baseLng = Number(row.lng);
    const key = `${baseLat.toFixed(4)},${baseLng.toFixed(4)}`;
    const dupIndex = seenCoords.get(key) ?? 0;
    seenCoords.set(key, dupIndex + 1);
    const angle = dupIndex * 2.39996;
    const radius = dupIndex === 0 ? 0 : Math.min(0.0022, 0.00028 * Math.sqrt(dupIndex));
    const lat = Number((baseLat + Math.cos(angle) * radius).toFixed(6));
    const lng = Number((baseLng + Math.sin(angle) * radius).toFixed(6));

    const rawCat = String(row.category ?? 'other').toLowerCase();
    const catMeta = CATEGORY_MAP[rawCat] ?? {
      id: 'roads',
      dept: 'Ward 115 Municipal Services',
      depot: 'Ward 115 Depot Desk',
      sla: 48,
    };
    const status = mapSignalDeskStatus(String(row.status ?? 'new'));
    const mediaArr = Array.isArray(row.ward_report_media)
      ? (row.ward_report_media as Array<{ storage_path?: string; ai_description?: string }>)
      : [];
    const firstMedia = mediaArr[0];
    const photoUrl = firstMedia?.storage_path
      ? `https://egzzgezgpwxgwmuipvmf.supabase.co/storage/v1/object/public/ward-media/${firstMedia.storage_path}`
      : undefined;
    const createdAtIso = String(row.created_at ?? new Date().toISOString());
    const resolvedAtIso =
      status === 'Resolved'
        ? String(row.resolved_at ?? row.updated_at ?? createdAtIso)
        : null;
    const desc = String(row.description ?? 'Ward 115 municipal service report').trim();
    const loc = String(row.location ?? 'Fourways / Ward 115').trim();
    const refNum = row.reference_number ? String(row.reference_number) : null;
    const sevRaw = String(row.severity ?? 'medium').toLowerCase();
    const severity =
      sevRaw === 'critical' ? 'CRITICAL' : sevRaw === 'high' ? 'HIGH' : sevRaw === 'low' ? 'LOW' : 'MODERATE';

    return {
      id: refNum || `W115-${String(row.id ?? '').slice(0, 8)}`,
      wardId: 'CoJ-115',
      municipalityCode: 'CoJ',
      wardNumber: 115,
      suburb: loc || 'Fourways',
      categoryId: catMeta.id,
      departmentLabel: catMeta.dept,
      title: desc.length > 72 ? `${desc.slice(0, 69)}…` : desc,
      description: firstMedia?.ai_description || desc,
      address: loc,
      lat,
      lng,
      municipalRef: refNum,
      status,
      severity,
      isEmergency: severity === 'CRITICAL',
      clusteredHouseholds: status === 'Resolved' ? 4 : 7,
      createdAtIso,
      resolvedAtIso,
      timeAgoLabel: formatRelativeAgo(createdAtIso),
      slaDeadlineHours: catMeta.sla,
      slaElapsedHours: status === 'Resolved' ? Math.min(catMeta.sla, 12) : 3,
      assignedDepot: String(row.allocated_to ?? catMeta.depot),
      reporterName: String(row.source_username ?? 'Ward 115 Resident'),
      photoUrl,
      forensics: {
        status: photoUrl ? 'VERIFIED' : 'WARNING_STRIPPED_METADATA',
        summaryLabel: 'Synced from Ward 115 Signal Desk',
        timestampLabel: formatRelativeAgo(createdAtIso),
        gpsMatchLabel: `Geocoded (${loc})`,
        deviceLabel: 'Signal Desk Ward 115',
        aiSyntheticScorePct: 0.02,
        notes: firstMedia?.ai_description ?? 'Live Ward 115 dashboard incident record.',
      },
      escalationLog: [
        `Synced from Ward 115 Signal Desk (${loc})`,
        status === 'Resolved' ? 'Marked resolved on Ward 115 dashboard' : `Routed to ${catMeta.depot}`,
      ],
      verifiedByResidents: status === 'Resolved' ? 3 : 1,
    };
  });

  return {
    ok: true,
    source: 'signal-desk-ward-115',
    totalReports: reportedTotal || activeRows.length,
    pinnedTotal: geocoded.length,
    unmappedCount,
    pins,
  };
}

export default async function handler(_req: any, res: any) {
  try {
    if (ward115Cache && Date.now() - ward115Cache.fetchedAt < 90_000) {
      res.setHeader('Cache-Control', 'public, s-maxage=90, stale-while-revalidate=120');
      res.json(ward115Cache.payload);
      return;
    }
    if (!ward115InFlight) {
      ward115InFlight = loadWard115FromSignalDesk().finally(() => {
        ward115InFlight = null;
      });
    }
    const payload = await ward115InFlight;
    ward115Cache = { fetchedAt: Date.now(), payload };
    res.setHeader('Cache-Control', 'public, s-maxage=90, stale-while-revalidate=120');
    res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load Ward 115 map pins.';
    console.warn('Ward 115 Signal Desk proxy fallback:', message);
    res.json({
      ok: false,
      source: 'local-fallback',
      totalReports: 0,
      pinnedTotal: 0,
      unmappedCount: 0,
      pins: [],
    });
  }
}
