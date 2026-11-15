import fs from 'node:fs';
import path from 'node:path';
import { normalizeSaMobile } from './server-auth.js';
import type {
  CivicReport,
  CouncillorAnalyticsSummary,
  CouncillorReporterGroup,
  MunicipalityCode,
  ReporterContactRecord,
  ReportStatus,
  RewardTransaction,
  ServiceCategoryId,
} from './src/types/civic.js';

interface ReportOverride {
  status?: ReportStatus;
  resolvedAtIso?: string | null;
  municipalRef?: string | null;
  addedHouseholds?: number;
  addedVerified?: number;
  forensicsStatus?: CivicReport['forensics']['status'];
  forensicsSummary?: string;
  addedLogs?: string[];
}

interface RedemptionRecord {
  id: string;
  voucherCode: string;
  offerId: string;
  title: string;
  costCredits: number;
  recipient: string;
  issuedAtIso: string;
  expiresAtIso: string;
}

interface CivicStoreState {
  reports: CivicReport[];
  reportOverrides: Record<string, ReportOverride>;
  reporterContacts: ReporterContactRecord[];
  redemptions: RedemptionRecord[];
  socialEvents: Array<{
    id: string;
    platform: string;
    wardId: string;
    linkedReportId: string | null;
    linkedRef: string | null;
    createdAtIso: string;
  }>;
}

const DATA_DIR =
  process.env.VERCEL === '1'
    ? '/tmp'
    : path.join(process.cwd(), '.data');
const STORE_PATH = path.join(DATA_DIR, 'civic-store.json');

function formatSaDisplay(raw: string): string {
  const norm = normalizeSaMobile(raw);
  if (!norm) return raw.trim();
  const local = norm.slice(3);
  return `+27 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
}

function buildSeedState(): CivicStoreState {
  const now = Date.now();
  const isoAgo = (mins: number) => new Date(now - mins * 60_000).toISOString();

  const initialReports: CivicReport[] = [
    {
      id: 'CP-2026-1048',
      wardId: 'CoJ-115',
      municipalityCode: 'CoJ',
      wardNumber: 115,
      suburb: 'Fourways',
      categoryId: 'water',
      departmentLabel: 'Water & Sanitation',
      title: 'Restored Water Supply at Fourways Gardens & Uranium Rd',
      description:
        'Johannesburg Water repair team completed 110mm isolation valve replacement and reopened supply. Verify water pressure is restored at your tap within 15 minutes of restoration.',
      address: 'Uranium Rd & Bushwillow Ave, Fourways',
      lat: -26.0119,
      lng: 27.9971,
      municipalRef: 'JWAPP-40131902',
      status: 'Resolved',
      severity: 'HIGH',
      isEmergency: false,
      clusteredHouseholds: 19,
      createdAtIso: isoAgo(140),
      resolvedAtIso: isoAgo(3),
      timeAgoLabel: 'Restored 3 mins ago',
      slaDeadlineHours: 24,
      slaElapsedHours: 2,
      assignedDepot: 'Joburg Water Randburg Depot',
      reporterName: 'Thabo M.',
      reporterPhone: '+27824198820',
      corroboratorPhones: ['+27835551942', '+27724089112'],
      forensics: {
        status: 'VERIFIED',
        summaryLabel: 'Service Restored · 15m Verify Window Open',
        timestampLabel: 'Restored 3 mins ago',
        gpsMatchLabel: 'GPS Match: 7m from pin',
        deviceLabel: 'Samsung Galaxy S24',
        aiSyntheticScorePct: 0.01,
        notes: 'Joburg Water crew marked repair complete 3 minutes ago; resident verification open for 15 minutes.',
      },
      escalationLog: [
        'Logged with JWAPP-40131902 reference',
        'Joburg Water Randburg Depot completed valve repair',
        'Service restored 3 mins ago — 15-minute resident Verify Fix window active',
      ],
      verifiedByResidents: 2,
    },
    {
      id: 'CP-2026-1041',
      wardId: 'CoJ-115',
      municipalityCode: 'CoJ',
      wardNumber: 115,
      suburb: 'Fourways',
      categoryId: 'water',
      departmentLabel: 'Water & Sanitation',
      title: 'Major 150mm Main Pipe Burst on Cedar Road',
      description:
        'High-pressure clean water gushing from fractured AC 150mm trunk main outside Cedar Square northern entrance. Roadway lane flooded; isolation valve shutdown requested.',
      address: 'Cedar Road & Campbell Rd, Fourways',
      lat: -26.0138,
      lng: 28.0052,
      municipalRef: 'JWAPP-40128554',
      status: 'Technician Dispatched',
      severity: 'CRITICAL',
      isEmergency: true,
      clusteredHouseholds: 18,
      createdAtIso: isoAgo(110),
      resolvedAtIso: null,
      timeAgoLabel: '1h 50m ago',
      slaDeadlineHours: 24,
      slaElapsedHours: 2,
      assignedDepot: 'Joburg Water Randburg Depot',
      reporterName: 'Thabo M.',
      reporterPhone: '+27824198820',
      corroboratorPhones: ['+27835551942', '+27849102344'],
      forensics: {
        status: 'VERIFIED',
        summaryLabel: 'Verified Live Capture (GPS + Timestamp Match)',
        timestampLabel: 'EXIF Timestamp: 14 mins ago',
        gpsMatchLabel: 'GPS Match: 12m from pin',
        deviceLabel: 'Samsung Galaxy S25 Ultra',
        aiSyntheticScorePct: 0.02,
        notes: 'Original camera EXIF intact; asphalt splash patterns verified authentic.',
      },
      escalationLog: [
        'Logged with GPS & EXIF forensic seal',
        'Matched 17 nearby household reports into unified cluster',
        'Escalated to Joburg Water Randburg Depot & Cllr Mark Van Der Merwe',
      ],
      verifiedByResidents: 4,
    },
    {
      id: 'CP-2026-1045',
      wardId: 'CoJ-115',
      municipalityCode: 'CoJ',
      wardNumber: 115,
      suburb: 'Fourways',
      categoryId: 'electricity',
      departmentLabel: 'Electricity & Power',
      title: 'Low-Voltage Feeder Fault near Witkoppen & William Nicol',
      description:
        'Intermittent brownouts and traffic signal flicker affecting Montecasino Boulevard and Fourways Crossing feeder.',
      address: 'Witkoppen Rd & William Nicol Dr, Fourways',
      lat: -26.0268,
      lng: 28.0145,
      municipalRef: 'CPWEB5013904',
      status: 'Logged',
      severity: 'CRITICAL',
      isEmergency: false,
      clusteredHouseholds: 27,
      createdAtIso: isoAgo(35),
      resolvedAtIso: null,
      timeAgoLabel: '35 mins ago',
      slaDeadlineHours: 24,
      slaElapsedHours: 1,
      assignedDepot: 'City Power Bryanston Depot',
      reporterName: 'Sipho Ndlovu',
      reporterPhone: '+27835551942',
      corroboratorPhones: ['+27724089112'],
      forensics: {
        status: 'VERIFIED',
        summaryLabel: 'Verified Live Capture (GPS + Timestamp Match)',
        timestampLabel: 'EXIF Timestamp: 28 mins ago',
        gpsMatchLabel: 'GPS Match: 11m from pin',
        deviceLabel: 'iPhone 15 Pro',
        aiSyntheticScorePct: 0.01,
        notes: 'Authentic field photo of feeder pillar cabinet.',
      },
      escalationLog: [
        'Logged with GPS & EXIF forensic seal (CPWEB5013904)',
        '27 households linked along Witkoppen corridor',
      ],
      verifiedByResidents: 6,
    },
    {
      id: 'CP-2026-1047',
      wardId: 'CoJ-115',
      municipalityCode: 'CoJ',
      wardNumber: 115,
      suburb: 'Bloubosrand',
      categoryId: 'streetlights',
      departmentLabel: 'Streetlights & Traffic Signals',
      title: 'Four-Way Signal Out at Witkoppen & Roos Street',
      description:
        'All intersection signals dark during afternoon peak following cable tamper alert.',
      address: 'Witkoppen Rd & Roos St, Bloubosrand',
      lat: -26.0294,
      lng: 27.9869,
      municipalRef: null,
      status: 'Logged',
      severity: 'HIGH',
      isEmergency: false,
      clusteredHouseholds: 14,
      createdAtIso: isoAgo(22),
      resolvedAtIso: null,
      timeAgoLabel: '22 mins ago',
      slaDeadlineHours: 24,
      slaElapsedHours: 0,
      assignedDepot: 'JRA Region A Depot',
      reporterName: 'Nomsa D.',
      reporterPhone: '+27724089112',
      forensics: {
        status: 'VERIFIED',
        summaryLabel: 'Verified Live Capture (GPS + Timestamp Match)',
        timestampLabel: 'EXIF Timestamp: 18 mins ago',
        gpsMatchLabel: 'GPS Match: 15m from pin',
        deviceLabel: 'Samsung Galaxy A55',
        aiSyntheticScorePct: 0.02,
        notes: 'Field photo verified authentic at Witkoppen & Roos junction.',
      },
      escalationLog: [
        'Logged by Ward 115 resident with GPS pin',
        'Awaiting JRA & JMPD points-duty allocation',
      ],
      verifiedByResidents: 5,
    },
    {
      id: 'CP-2026-1042',
      wardId: 'CoJ-101',
      municipalityCode: 'CoJ',
      wardNumber: 101,
      suburb: 'North Riding',
      categoryId: 'electricity',
      departmentLabel: 'Electricity & Power',
      title: 'Mini-Substation Tripped on Bellairs Drive',
      description:
        '3-phase feeder trip affecting Bellairs Drive and Blandford Road residential complexes.',
      address: 'Bellairs Drive & Blandford Rd, North Riding',
      lat: -26.0512,
      lng: 27.9598,
      municipalRef: 'CPWEB5012172',
      status: 'Escalated to Depot',
      severity: 'HIGH',
      isEmergency: false,
      clusteredHouseholds: 34,
      createdAtIso: isoAgo(180),
      resolvedAtIso: null,
      timeAgoLabel: '3h ago',
      slaDeadlineHours: 24,
      slaElapsedHours: 26,
      assignedDepot: 'City Power Randburg Depot',
      reporterName: 'Annelize V.',
      reporterPhone: '+27849102344',
      forensics: {
        status: 'VERIFIED',
        summaryLabel: 'Verified Live Capture (GPS + Timestamp Match)',
        timestampLabel: 'EXIF Timestamp: 42 mins ago',
        gpsMatchLabel: 'GPS Match: 8m from pin',
        deviceLabel: 'iPhone 16 Pro',
        aiSyntheticScorePct: 0.01,
        notes: 'Authentic field photograph verified consistent with City Power enclosure.',
      },
      escalationLog: [
        'Logged with CPWEB5012172 reference',
        '34 affected households linked via @NorthRidingPowerWatch bridge',
      ],
      verifiedByResidents: 2,
    },
  ];

  const initialContacts: ReporterContactRecord[] = [
    {
      id: 'RC-SEED-1',
      reportId: 'CP-2026-1048',
      reportTitle: 'Restored Water Supply at Fourways Gardens & Uranium Rd',
      wardId: 'CoJ-115',
      wardNumber: 115,
      municipalityCode: 'CoJ',
      categoryId: 'water',
      status: 'Resolved',
      reporterName: 'Thabo M.',
      mobileNumber: '+27 82 419 8820',
      normalizedMobile: '+27824198820',
      contributionType: 'primary_report',
      pointsEarned: 50,
      pointsClaimed: true,
      createdAtIso: isoAgo(140),
      municipalRef: 'JWAPP-40131902',
      address: 'Uranium Rd & Bushwillow Ave, Fourways',
    },
    {
      id: 'RC-SEED-2',
      reportId: 'CP-2026-1041',
      reportTitle: 'Major 150mm Main Pipe Burst on Cedar Road',
      wardId: 'CoJ-115',
      wardNumber: 115,
      municipalityCode: 'CoJ',
      categoryId: 'water',
      status: 'Technician Dispatched',
      reporterName: 'Thabo M.',
      mobileNumber: '+27 82 419 8820',
      normalizedMobile: '+27824198820',
      contributionType: 'primary_report',
      pointsEarned: 50,
      pointsClaimed: true,
      createdAtIso: isoAgo(110),
      municipalRef: 'JWAPP-40128554',
      address: 'Cedar Road & Campbell Rd, Fourways',
    },
    {
      id: 'RC-SEED-3',
      reportId: 'CP-2026-1045',
      reportTitle: 'Low-Voltage Feeder Fault near Witkoppen & William Nicol',
      wardId: 'CoJ-115',
      wardNumber: 115,
      municipalityCode: 'CoJ',
      categoryId: 'electricity',
      status: 'Logged',
      reporterName: 'Sipho Ndlovu',
      mobileNumber: '+27 83 555 1942',
      normalizedMobile: '+27835551942',
      contributionType: 'primary_report',
      pointsEarned: 50,
      pointsClaimed: false,
      createdAtIso: isoAgo(35),
      municipalRef: 'CPWEB5013904',
      address: 'Witkoppen Rd & William Nicol Dr, Fourways',
    },
    {
      id: 'RC-SEED-4',
      reportId: 'CP-2026-1041',
      reportTitle: 'Major 150mm Main Pipe Burst on Cedar Road',
      wardId: 'CoJ-115',
      wardNumber: 115,
      municipalityCode: 'CoJ',
      categoryId: 'water',
      status: 'Technician Dispatched',
      reporterName: 'Sipho Ndlovu',
      mobileNumber: '+27 83 555 1942',
      normalizedMobile: '+27835551942',
      contributionType: 'me_too',
      pointsEarned: 15,
      pointsClaimed: false,
      createdAtIso: isoAgo(95),
      municipalRef: 'JWAPP-40128554',
      address: 'Cedar Road & Campbell Rd, Fourways',
    },
    {
      id: 'RC-SEED-5',
      reportId: 'CP-2026-1047',
      reportTitle: 'Four-Way Signal Out at Witkoppen & Roos Street',
      wardId: 'CoJ-115',
      wardNumber: 115,
      municipalityCode: 'CoJ',
      categoryId: 'streetlights',
      status: 'Logged',
      reporterName: 'Nomsa D.',
      mobileNumber: '+27 72 408 9112',
      normalizedMobile: '+27724089112',
      contributionType: 'primary_report',
      pointsEarned: 50,
      pointsClaimed: false,
      createdAtIso: isoAgo(22),
      municipalRef: null,
      address: 'Witkoppen Rd & Roos St, Bloubosrand',
    },
    {
      id: 'RC-SEED-6',
      reportId: 'CP-2026-1042',
      reportTitle: 'Mini-Substation Tripped on Bellairs Drive',
      wardId: 'CoJ-101',
      wardNumber: 101,
      municipalityCode: 'CoJ',
      categoryId: 'electricity',
      status: 'Escalated to Depot',
      reporterName: 'Annelize V.',
      mobileNumber: '+27 84 910 2344',
      normalizedMobile: '+27849102344',
      contributionType: 'primary_report',
      pointsEarned: 50,
      pointsClaimed: true,
      createdAtIso: isoAgo(180),
      municipalRef: 'CPWEB5012172',
      address: 'Bellairs Drive & Blandford Rd, North Riding',
    },
  ];

  return {
    reports: initialReports,
    reportOverrides: {},
    reporterContacts: initialContacts,
    redemptions: [],
    socialEvents: [],
  };
}

let cachedState: CivicStoreState | null = null;

function readStore(): CivicStoreState {
  if (cachedState) return cachedState;
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as Partial<CivicStoreState>;
      const seed = buildSeedState();
      cachedState = {
        reports: Array.isArray(parsed.reports) && parsed.reports.length > 0 ? parsed.reports : seed.reports,
        reportOverrides: parsed.reportOverrides ?? {},
        reporterContacts: Array.isArray(parsed.reporterContacts) ? parsed.reporterContacts : seed.reporterContacts,
        redemptions: Array.isArray(parsed.redemptions) ? parsed.redemptions : [],
        socialEvents: Array.isArray(parsed.socialEvents) ? parsed.socialEvents : [],
      };
      return cachedState;
    }
  } catch (err) {
    console.warn('[store] Failed to read civic-store.json, initializing fresh store:', err);
  }
  cachedState = buildSeedState();
  writeStore(cachedState);
  return cachedState;
}

function writeStore(state: CivicStoreState): void {
  cachedState = state;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmpPath = `${STORE_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tmpPath, STORE_PATH);
  } catch (err) {
    console.warn('[store] Persistence write warning:', err);
  }
}

function applyOverride(r: CivicReport, override?: ReportOverride): CivicReport {
  if (!override) return r;
  return {
    ...r,
    status: override.status ?? r.status,
    resolvedAtIso: override.resolvedAtIso !== undefined ? override.resolvedAtIso : r.resolvedAtIso,
    municipalRef: override.municipalRef !== undefined ? override.municipalRef : r.municipalRef,
    clusteredHouseholds: r.clusteredHouseholds + (override.addedHouseholds ?? 0),
    verifiedByResidents: r.verifiedByResidents + (override.addedVerified ?? 0),
    forensics: override.forensicsStatus
      ? {
          ...r.forensics,
          status: override.forensicsStatus,
          summaryLabel: override.forensicsSummary ?? r.forensics.summaryLabel,
        }
      : r.forensics,
    escalationLog: override.addedLogs ? [...r.escalationLog, ...override.addedLogs] : r.escalationLog,
  };
}

export function normalizeMobileOrFallback(raw?: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const e164 = normalizeSaMobile(raw);
  if (e164) return e164;
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 9) return `+${digits}`;
  return null;
}

export function listReports(filters?: {
  ward?: string | null;
  status?: string | null;
  category?: string | null;
  q?: string | null;
}): CivicReport[] {
  const store = readStore();
  const merged = store.reports.map((r) => applyOverride(r, store.reportOverrides[r.id]));
  const ward = filters?.ward?.trim().toLowerCase() || null;
  const status = filters?.status?.trim().toLowerCase() || null;
  const category = filters?.category?.trim().toLowerCase() || null;
  const q = filters?.q?.trim().toLowerCase() || null;

  return merged
    .filter((r) => {
      if (ward && ward !== 'all') {
        if (!r.wardId.toLowerCase().includes(ward) && String(r.wardNumber) !== ward) return false;
      }
      if (status && status !== 'all' && r.status.toLowerCase() !== status) return false;
      if (category && category !== 'all' && r.categoryId.toLowerCase() !== category) return false;
      if (q) {
        const hay = [
          r.id,
          r.title,
          r.description,
          r.address,
          r.suburb,
          r.assignedDepot,
          r.municipalRef ?? '',
          r.reporterName,
          r.reporterPhone ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime());
}

export function saveSubmittedReport(
  report: CivicReport,
  opts?: {
    reporterPhone?: string | null;
    signedIn?: boolean;
    potentialPoints?: number;
  }
): {
  report: CivicReport;
  contactRecord: ReporterContactRecord | null;
  pendingCreditsForMobile: number;
} {
  const store = readStore();
  const normalizedPhone = normalizeMobileOrFallback(opts?.reporterPhone ?? report.reporterPhone);
  const storedReport: CivicReport = {
    ...report,
    reporterPhone: normalizedPhone ?? report.reporterPhone ?? null,
    escalationLog: normalizedPhone
      ? [
          ...report.escalationLog,
          `Reporter mobile ${formatSaDisplay(normalizedPhone)} linked for Ward Councillor coordination`,
        ]
      : report.escalationLog,
  };

  store.reports = [storedReport, ...store.reports.filter((r) => r.id !== storedReport.id)];

  let contactRecord: ReporterContactRecord | null = null;
  const pts = typeof opts?.potentialPoints === 'number'
    ? opts.potentialPoints
    : storedReport.forensics.status === 'VERIFIED'
      ? 50
      : storedReport.photoUrl
        ? 25
        : 15;

  if (normalizedPhone) {
    contactRecord = {
      id: `RC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      reportId: storedReport.id,
      reportTitle: storedReport.title,
      wardId: storedReport.wardId,
      wardNumber: storedReport.wardNumber,
      municipalityCode: storedReport.municipalityCode,
      categoryId: storedReport.categoryId,
      status: storedReport.status,
      reporterName: storedReport.reporterName || 'Ward Resident',
      mobileNumber: formatSaDisplay(normalizedPhone),
      normalizedMobile: normalizedPhone,
      contributionType: 'primary_report',
      pointsEarned: pts,
      pointsClaimed: Boolean(opts?.signedIn),
      createdAtIso: storedReport.createdAtIso,
      municipalRef: storedReport.municipalRef,
      address: storedReport.address,
    };
    store.reporterContacts = [contactRecord, ...store.reporterContacts];
  }

  writeStore(store);

  const pendingCreditsForMobile = normalizedPhone
    ? store.reporterContacts
        .filter((c) => c.normalizedMobile === normalizedPhone && !c.pointsClaimed)
        .reduce((sum, c) => sum + c.pointsEarned, 0)
    : 0;

  return { report: storedReport, contactRecord, pendingCreditsForMobile };
}

export function patchReportRecord(
  reportId: string,
  patch: {
    status?: ReportStatus;
    municipalRef?: string;
    escalationNote?: string;
    approveStrippedMedia?: boolean;
    sendSlaReminder?: boolean;
  }
): { report: CivicReport | null; override: ReportOverride } {
  const store = readStore();
  const idx = store.reports.findIndex((r) => r.id === reportId);
  const nowIso = new Date().toISOString();

  if (idx >= 0) {
    const existing = store.reports[idx]!;
    const nextStatus = patch.approveStrippedMedia
      ? existing.status === 'Logged'
        ? 'Escalated to Depot'
        : existing.status
      : patch.status ?? existing.status;

    const logs = [...existing.escalationLog];
    if (patch.status) {
      logs.push(`Status updated to "${patch.status}" by Councillor/Depot Desk`);
    }
    if (patch.municipalRef) {
      logs.push(`Official municipal ref ${patch.municipalRef} attached`);
    }
    if (patch.sendSlaReminder) {
      logs.push(`Automated SLA follow-up dispatched to ${existing.assignedDepot} & Regional Director`);
    }
    if (patch.approveStrippedMedia) {
      logs.push('Councillor manually verified compressed evidence & escalated to depot');
    }
    if (patch.escalationNote) {
      logs.push(patch.escalationNote);
    }

    const updated: CivicReport = {
      ...existing,
      status: nextStatus,
      resolvedAtIso:
        nextStatus === 'Resolved'
          ? existing.status === 'Resolved' && existing.resolvedAtIso
            ? existing.resolvedAtIso
            : nowIso
          : patch.status
            ? null
            : existing.resolvedAtIso,
      municipalRef: patch.municipalRef ?? existing.municipalRef,
      forensics: patch.approveStrippedMedia
        ? {
            ...existing.forensics,
            status: 'VERIFIED',
            summaryLabel: 'Verified by Ward Councillor + Neighbor Corroboration',
          }
        : existing.forensics,
      escalationLog: logs,
    };

    store.reports[idx] = updated;
    store.reporterContacts = store.reporterContacts.map((c) =>
      c.reportId === reportId
        ? {
            ...c,
            status: updated.status,
            municipalRef: updated.municipalRef,
          }
        : c
    );
    writeStore(store);
    return { report: updated, override: {} };
  }

  // Fallback override for reports living only in external Signal Desk or client seed
  const ov = store.reportOverrides[reportId] ?? {};
  const nextStatus = patch.status ?? ov.status;
  const nextOv: ReportOverride = {
    ...ov,
    status: nextStatus,
    resolvedAtIso:
      nextStatus === 'Resolved'
        ? ov.resolvedAtIso ?? nowIso
        : patch.status
          ? null
          : ov.resolvedAtIso,
    municipalRef: patch.municipalRef ?? ov.municipalRef,
    forensicsStatus: patch.approveStrippedMedia ? 'VERIFIED' : ov.forensicsStatus,
    forensicsSummary: patch.approveStrippedMedia
      ? 'Verified by Ward Councillor + Neighbor Corroboration'
      : ov.forensicsSummary,
    addedLogs: [
      ...(ov.addedLogs ?? []),
      ...(patch.status ? [`Status updated to "${patch.status}" by Councillor/Depot Desk`] : []),
      ...(patch.municipalRef ? [`Official municipal ref ${patch.municipalRef} attached`] : []),
      ...(patch.sendSlaReminder ? ['Automated SLA follow-up dispatched to depot'] : []),
      ...(patch.escalationNote ? [patch.escalationNote] : []),
    ],
  };
  store.reportOverrides[reportId] = nextOv;
  store.reporterContacts = store.reporterContacts.map((c) =>
    c.reportId === reportId
      ? {
          ...c,
          status: nextStatus ?? c.status,
          municipalRef: patch.municipalRef ?? c.municipalRef,
        }
      : c
  );
  writeStore(store);
  return { report: null, override: nextOv };
}

export function recordCorroboration(input: {
  reportId: string;
  userPhone?: string | null;
  reporterName?: string;
  wardId?: string;
  wardNumber?: number;
  municipalityCode?: MunicipalityCode;
  categoryId?: ServiceCategoryId;
  reportTitle?: string;
  address?: string;
  municipalRef?: string | null;
  status?: ReportStatus;
  signedIn?: boolean;
}): {
  reportId: string;
  clusteredHouseholds: number | null;
  contactRecord: ReporterContactRecord | null;
  pendingCreditsForMobile: number;
} {
  const store = readStore();
  const normalizedPhone = normalizeMobileOrFallback(input.userPhone);
  const idx = store.reports.findIndex((r) => r.id === input.reportId);
  let targetReport: CivicReport | undefined = idx >= 0 ? store.reports[idx] : undefined;
  let newHouseholds: number | null = null;

  if (idx >= 0 && targetReport) {
    const phones = new Set(targetReport.corroboratorPhones ?? []);
    if (normalizedPhone) phones.add(normalizedPhone);
    const updated: CivicReport = {
      ...targetReport,
      clusteredHouseholds: targetReport.clusteredHouseholds + 1,
      corroboratorPhones: Array.from(phones),
      escalationLog: [
        ...targetReport.escalationLog,
        normalizedPhone
          ? `Resident household linked (+1 Me Too · ${formatSaDisplay(normalizedPhone)})`
          : 'Additional resident household linked to cluster (+1 Me Too)',
      ],
    };
    store.reports[idx] = updated;
    targetReport = updated;
    newHouseholds = updated.clusteredHouseholds;
  } else {
    const ov = store.reportOverrides[input.reportId] ?? {};
    store.reportOverrides[input.reportId] = {
      ...ov,
      addedHouseholds: (ov.addedHouseholds ?? 0) + 1,
      addedLogs: [
        ...(ov.addedLogs ?? []),
        normalizedPhone
          ? `Resident household linked (+1 Me Too · ${formatSaDisplay(normalizedPhone)})`
          : 'Additional resident household linked (+1 Me Too)',
      ],
    };
  }

  let contactRecord: ReporterContactRecord | null = null;
  if (normalizedPhone) {
    contactRecord = {
      id: `RC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      reportId: input.reportId,
      reportTitle: targetReport?.title ?? input.reportTitle ?? `Incident ${input.reportId}`,
      wardId: targetReport?.wardId ?? input.wardId ?? 'CoJ-115',
      wardNumber: targetReport?.wardNumber ?? input.wardNumber ?? 115,
      municipalityCode: targetReport?.municipalityCode ?? input.municipalityCode ?? 'CoJ',
      categoryId: targetReport?.categoryId ?? input.categoryId ?? 'water',
      status: targetReport?.status ?? input.status ?? 'Logged',
      reporterName: (input.reporterName || '').trim() || 'Ward Neighbour',
      mobileNumber: formatSaDisplay(normalizedPhone),
      normalizedMobile: normalizedPhone,
      contributionType: 'me_too',
      pointsEarned: 15,
      pointsClaimed: Boolean(input.signedIn),
      createdAtIso: new Date().toISOString(),
      municipalRef: targetReport?.municipalRef ?? input.municipalRef ?? null,
      address: targetReport?.address ?? input.address ?? 'Ward Cluster Pin',
    };
    store.reporterContacts = [contactRecord, ...store.reporterContacts];
  }

  writeStore(store);

  const pendingCreditsForMobile = normalizedPhone
    ? store.reporterContacts
        .filter((c) => c.normalizedMobile === normalizedPhone && !c.pointsClaimed)
        .reduce((sum, c) => sum + c.pointsEarned, 0)
    : 0;

  return {
    reportId: input.reportId,
    clusteredHouseholds: newHouseholds,
    contactRecord,
    pendingCreditsForMobile,
  };
}

export function recordVerification(input: {
  reportId: string;
  resolvedAtIso?: string | null;
  userPhone?: string | null;
  reporterName?: string;
  wardId?: string;
  wardNumber?: number;
  municipalityCode?: MunicipalityCode;
  categoryId?: ServiceCategoryId;
  reportTitle?: string;
  address?: string;
  municipalRef?: string | null;
  signedIn?: boolean;
}): {
  ok: boolean;
  error?: string;
  elapsedMinutes?: number;
  remainingSeconds?: number;
  contactRecord?: ReporterContactRecord | null;
} {
  const fifteenMinsMs = 15 * 60 * 1000;
  const resolvedTime = input.resolvedAtIso ? new Date(input.resolvedAtIso).getTime() : Date.now();
  const elapsedMs = Date.now() - resolvedTime;
  if (elapsedMs > fifteenMinsMs) {
    return {
      ok: false,
      error:
        'Verification window expired. Restored services can only be verified for up to 15 minutes after restoration.',
      elapsedMinutes: Math.round(elapsedMs / 60000),
    };
  }

  const store = readStore();
  const normalizedPhone = normalizeMobileOrFallback(input.userPhone);
  const idx = store.reports.findIndex((r) => r.id === input.reportId);
  const nowIso = new Date().toISOString();
  let targetReport = idx >= 0 ? store.reports[idx] : undefined;

  if (idx >= 0 && targetReport) {
    const updated: CivicReport = {
      ...targetReport,
      status: 'Resolved',
      resolvedAtIso: targetReport.resolvedAtIso ?? nowIso,
      verifiedByResidents: targetReport.verifiedByResidents + 1,
      escalationLog: [
        ...targetReport.escalationLog,
        'Resident confirmed service restored within 15m verify window',
      ],
    };
    store.reports[idx] = updated;
    targetReport = updated;
  } else {
    const ov = store.reportOverrides[input.reportId] ?? {};
    store.reportOverrides[input.reportId] = {
      ...ov,
      status: 'Resolved',
      resolvedAtIso: ov.resolvedAtIso ?? input.resolvedAtIso ?? nowIso,
      addedVerified: (ov.addedVerified ?? 0) + 1,
      addedLogs: [
        ...(ov.addedLogs ?? []),
        'Resident confirmed service restored within 15m verify window',
      ],
    };
  }

  let contactRecord: ReporterContactRecord | null = null;
  if (normalizedPhone) {
    contactRecord = {
      id: `RC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      reportId: input.reportId,
      reportTitle: targetReport?.title ?? input.reportTitle ?? `Incident ${input.reportId}`,
      wardId: targetReport?.wardId ?? input.wardId ?? 'CoJ-115',
      wardNumber: targetReport?.wardNumber ?? input.wardNumber ?? 115,
      municipalityCode: targetReport?.municipalityCode ?? input.municipalityCode ?? 'CoJ',
      categoryId: targetReport?.categoryId ?? input.categoryId ?? 'water',
      status: 'Resolved',
      reporterName: (input.reporterName || '').trim() || 'Ward Resident',
      mobileNumber: formatSaDisplay(normalizedPhone),
      normalizedMobile: normalizedPhone,
      contributionType: 'verify_fix',
      pointsEarned: 30,
      pointsClaimed: Boolean(input.signedIn),
      createdAtIso: nowIso,
      municipalRef: targetReport?.municipalRef ?? input.municipalRef ?? null,
      address: targetReport?.address ?? input.address ?? 'Ward Verification',
    };
    store.reporterContacts = [contactRecord, ...store.reporterContacts];
  }

  writeStore(store);
  return {
    ok: true,
    remainingSeconds: Math.max(0, Math.round((fifteenMinsMs - elapsedMs) / 1000)),
    contactRecord,
  };
}

export function getCouncillorAnalytics(params?: {
  wardId?: string | null;
  search?: string | null;
}): CouncillorAnalyticsSummary {
  const store = readStore();
  const wardId = params?.wardId && params.wardId !== 'ALL' ? params.wardId : 'ALL';
  const q = params?.search?.trim().toLowerCase() || '';

  const allReports = store.reports
    .map((r) => applyOverride(r, store.reportOverrides[r.id]))
    .filter((r) => wardId === 'ALL' || r.wardId === wardId);

  const reportById = new Map<string, CivicReport>();
  for (const r of allReports) {
    reportById.set(r.id, r);
  }

  const wardContacts = store.reporterContacts.filter((c) => {
    if (wardId !== 'ALL' && c.wardId !== wardId) return false;
    if (!q) return true;
    const hay = [
      c.mobileNumber,
      c.normalizedMobile,
      c.reporterName,
      c.reportId,
      c.reportTitle,
      c.address,
      c.municipalRef ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });

  // Group contacts by normalizedMobile
  const groupsMap = new Map<string, CouncillorReporterGroup>();
  for (const c of wardContacts) {
    const linked = reportById.get(c.reportId);
    const currentStatus = linked?.status ?? c.status;
    const currentRef = linked?.municipalRef ?? c.municipalRef;
    const existing = groupsMap.get(c.normalizedMobile);
    const entry = {
      reportId: c.reportId,
      title: linked?.title ?? c.reportTitle,
      wardId: c.wardId,
      wardNumber: c.wardNumber,
      categoryId: c.categoryId,
      status: currentStatus,
      municipalRef: currentRef,
      address: linked?.address ?? c.address,
      contributionType: c.contributionType,
      pointsEarned: c.pointsEarned,
      pointsClaimed: c.pointsClaimed,
      createdAtIso: c.createdAtIso,
    };

    if (!existing) {
      groupsMap.set(c.normalizedMobile, {
        normalizedMobile: c.normalizedMobile,
        displayMobile: c.mobileNumber || formatSaDisplay(c.normalizedMobile),
        reporterNames: c.reporterName ? [c.reporterName] : ['Ward Resident'],
        reportCount: c.contributionType === 'primary_report' ? 1 : 0,
        meTooCount: c.contributionType === 'me_too' ? 1 : 0,
        verifyCount: c.contributionType === 'verify_fix' ? 1 : 0,
        totalPoints: c.pointsEarned,
        unclaimedPoints: c.pointsClaimed ? 0 : c.pointsEarned,
        lastReportedAtIso: c.createdAtIso,
        reports: [entry],
      });
    } else {
      if (c.reporterName && !existing.reporterNames.includes(c.reporterName)) {
        existing.reporterNames.push(c.reporterName);
      }
      if (c.contributionType === 'primary_report') existing.reportCount += 1;
      if (c.contributionType === 'me_too') existing.meTooCount += 1;
      if (c.contributionType === 'verify_fix') existing.verifyCount += 1;
      existing.totalPoints += c.pointsEarned;
      if (!c.pointsClaimed) existing.unclaimedPoints += c.pointsEarned;
      if (new Date(c.createdAtIso).getTime() > new Date(existing.lastReportedAtIso).getTime()) {
        existing.lastReportedAtIso = c.createdAtIso;
      }
      existing.reports.push(entry);
    }
  }

  const reportersByMobile = Array.from(groupsMap.values())
    .map((g) => ({
      ...g,
      reports: g.reports.sort(
        (a, b) => new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime()
      ),
    }))
    .sort(
      (a, b) =>
        new Date(b.lastReportedAtIso).getTime() - new Date(a.lastReportedAtIso).getTime()
    );

  const catCounts = new Map<ServiceCategoryId, { count: number; openCount: number }>();
  for (const r of allReports) {
    const prev = catCounts.get(r.categoryId) ?? { count: 0, openCount: 0 };
    prev.count += 1;
    if (r.status !== 'Resolved' && r.status !== 'Blocked by AI Forensics') {
      prev.openCount += 1;
    }
    catCounts.set(r.categoryId, prev);
  }
  const byCategory = Array.from(catCounts.entries())
    .map(([categoryId, counts]) => ({ categoryId, ...counts }))
    .sort((a, b) => b.count - a.count);

  const openReports = allReports.filter(
    (r) => r.status !== 'Resolved' && r.status !== 'Blocked by AI Forensics'
  ).length;
  const resolvedReports = allReports.filter((r) => r.status === 'Resolved').length;
  const slaBreachedReports = allReports.filter(
    (r) =>
      r.status !== 'Resolved' &&
      r.status !== 'Blocked by AI Forensics' &&
      r.slaElapsedHours > r.slaDeadlineHours
  ).length;
  const unclaimedPointsTotal = wardContacts
    .filter((c) => !c.pointsClaimed)
    .reduce((sum, c) => sum + c.pointsEarned, 0);

  return {
    ok: true,
    wardId,
    totalReports: allReports.length,
    openReports,
    resolvedReports,
    slaBreachedReports,
    uniqueReporterNumbers: reportersByMobile.length,
    totalContactSubmissions: wardContacts.length,
    unclaimedPointsTotal,
    byCategory,
    reportersByMobile,
    submissions: wardContacts.sort(
      (a, b) => new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime()
    ),
  };
}

export function getPendingRewardsForMobile(rawMobile: string): {
  ok: boolean;
  normalizedMobile: string | null;
  displayMobile: string;
  pendingPoints: number;
  claimedPoints: number;
  pendingCount: number;
  records: ReporterContactRecord[];
} {
  const normalized = normalizeMobileOrFallback(rawMobile);
  if (!normalized) {
    return {
      ok: false,
      normalizedMobile: null,
      displayMobile: rawMobile,
      pendingPoints: 0,
      claimedPoints: 0,
      pendingCount: 0,
      records: [],
    };
  }
  const store = readStore();
  const matching = store.reporterContacts.filter((c) => c.normalizedMobile === normalized);
  const pendingRecords = matching.filter((c) => !c.pointsClaimed);
  return {
    ok: true,
    normalizedMobile: normalized,
    displayMobile: formatSaDisplay(normalized),
    pendingPoints: pendingRecords.reduce((sum, c) => sum + c.pointsEarned, 0),
    claimedPoints: matching
      .filter((c) => c.pointsClaimed)
      .reduce((sum, c) => sum + c.pointsEarned, 0),
    pendingCount: pendingRecords.length,
    records: pendingRecords,
  };
}

export function claimRewardsForMobile(rawMobile: string): {
  ok: boolean;
  normalizedMobile: string | null;
  claimedPoints: number;
  claimedCount: number;
  transactions: RewardTransaction[];
} {
  const normalized = normalizeMobileOrFallback(rawMobile);
  if (!normalized) {
    return {
      ok: false,
      normalizedMobile: null,
      claimedPoints: 0,
      claimedCount: 0,
      transactions: [],
    };
  }
  const store = readStore();
  const transactions: RewardTransaction[] = [];
  let claimedPoints = 0;
  let claimedCount = 0;

  store.reporterContacts = store.reporterContacts.map((c) => {
    if (c.normalizedMobile === normalized && !c.pointsClaimed) {
      claimedPoints += c.pointsEarned;
      claimedCount += 1;
      transactions.push({
        id: `TX-CLM-${c.id}`,
        title:
          c.contributionType === 'me_too'
            ? 'Claimed +1 Me Too Corroboration'
            : c.contributionType === 'verify_fix'
              ? 'Claimed Verify Fix Bonus'
              : 'Claimed Mobile Report Credits',
        subtitle: `${c.reportId} · ${c.reportTitle} (${c.mobileNumber})`,
        points: c.pointsEarned,
        timestampLabel: 'Claimed just now',
        type: 'earn',
      });
      return { ...c, pointsClaimed: true };
    }
    return c;
  });

  if (claimedCount > 0) {
    writeStore(store);
  }

  return {
    ok: true,
    normalizedMobile: normalized,
    claimedPoints,
    claimedCount,
    transactions,
  };
}

export function recordRewardRedemption(input: {
  offerId: string;
  costCredits: number;
  title?: string;
  userPhone?: string;
}): RedemptionRecord {
  const store = readStore();
  const voucherCode = `CP-${Math.floor(100000 + Math.random() * 900000)}`;
  const issuedAtIso = new Date().toISOString();
  const expiresAtIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const record: RedemptionRecord = {
    id: `RDM-${Date.now()}`,
    voucherCode,
    offerId: input.offerId,
    title: input.title || 'Civic Partner Voucher',
    costCredits: input.costCredits,
    recipient: input.userPhone || 'Civic Resident',
    issuedAtIso,
    expiresAtIso,
  };
  store.redemptions = [record, ...store.redemptions];
  writeStore(store);
  return record;
}

export function recordSocialLinkEvent(input: {
  platform: string;
  wardId: string;
  linkedReportId?: string | null;
  linkedRef?: string | null;
}): void {
  const store = readStore();
  store.socialEvents = [
    {
      id: `SOC-${Date.now()}`,
      platform: input.platform,
      wardId: input.wardId,
      linkedReportId: input.linkedReportId ?? null,
      linkedRef: input.linkedRef ?? null,
      createdAtIso: new Date().toISOString(),
    },
    ...store.socialEvents,
  ];
  writeStore(store);
}

export function getStoreMetrics(wardNumber?: number) {
  const store = readStore();
  const all = listReports();
  const filtered = wardNumber ? all.filter((r) => r.wardNumber === wardNumber) : all;
  const activeIncidents = filtered.filter(
    (r) => r.status !== 'Resolved' && r.status !== 'Blocked by AI Forensics'
  ).length;
  const resolvedCount = filtered.filter((r) => r.status === 'Resolved').length;
  const uniqueReporters = new Set(
    store.reporterContacts
      .filter((c) => !wardNumber || c.wardNumber === wardNumber)
      .map((c) => c.normalizedMobile)
  ).size;

  return {
    totalStoredReports: store.reports.length,
    totalReporterContacts: store.reporterContacts.length,
    uniqueReporters,
    activeIncidents,
    resolvedCount,
  };
}
