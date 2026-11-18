export type MunicipalityCode = 'CoJ' | 'CoCT' | 'CoT' | 'eThekwini';

export type ServiceCategoryId =
  | 'water'
  | 'electricity'
  | 'waste'
  | 'sanitation'
  | 'roads'
  | 'streetlights'
  | 'parks'
  | 'safety'
  | 'accounts'
  | 'anticorruption'
  | 'notices';

export type ReportStatus =
  | 'Logged'
  | 'Escalated to Depot'
  | 'Technician Dispatched'
  | 'Resolved'
  | 'Blocked by AI Forensics';

export type AuthenticityStatus =
  | 'VERIFIED'
  | 'WARNING_STRIPPED_METADATA'
  | 'FLAGGED_SYNTHETIC';

export type SeverityLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface WardDepots {
  electricity: string;
  water: string;
  roads: string;
  waste?: string;
}

export interface WardRecord {
  id: string;
  municipalityCode: MunicipalityCode;
  municipalityName: string;
  wardNumber: number;
  suburbs: string[];
  corridors: string[];
  lat: number;
  lng: number;
  populationEstimate: number;
  councillor: {
    name: string;
    party: string;
    email: string;
    whatsappEscalation: string;
    resolutionScore: number;
    activeTickets: number;
    monthlyResolutions: number;
  };
  depots: WardDepots;
}

export interface ServiceCategory {
  id: ServiceCategoryId;
  title: string;
  shortTitle: string;
  entity: string;
  description: string;
  refHint: string;
  slaHours: number;
  imageUrl: string;
  dayImageUrl: string;
  isInfoModule?: boolean;
}

export interface ExifMetadataPayload {
  timestampIso: string | null;
  ageMinutes: number | null;
  latitude: number | null;
  longitude: number | null;
  distanceFromPinMeters: number | null;
  deviceMakeModel: string | null;
  fileName: string;
  fileSizeKb: number;
  stripped: boolean;
}

export interface ForensicAnalysisResult {
  authenticityStatus: AuthenticityStatus;
  confidenceScore: number;
  isAiGenerated: boolean;
  forensicNotes: string;
  metadataCheck: {
    timestampValid: boolean;
    gpsMatchMeters: number | null;
    deviceDetected: string;
  };
  triage: {
    department: string;
    faultTitle: string;
    severity: SeverityLevel;
    engineeringSummary: string;
    immediateDanger: boolean;
  };
}

export interface CivicReport {
  id: string;
  wardId: string;
  municipalityCode: MunicipalityCode;
  wardNumber: number;
  suburb: string;
  categoryId: ServiceCategoryId;
  departmentLabel: string;
  title: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  municipalRef: string | null;
  status: ReportStatus;
  severity: SeverityLevel;
  isEmergency: boolean;
  clusteredHouseholds: number;
  createdAtIso: string;
  resolvedAtIso?: string | null;
  timeAgoLabel: string;
  slaDeadlineHours: number;
  slaElapsedHours: number;
  assignedDepot: string;
  reporterName: string;
  reporterPhone?: string | null;
  corroboratorPhones?: string[];
  photoUrl?: string;
  forensics: {
    status: AuthenticityStatus;
    summaryLabel: string;
    timestampLabel: string;
    gpsMatchLabel: string;
    deviceLabel: string;
    aiSyntheticScorePct: number;
    notes: string;
  };
  escalationLog: string[];
  verifiedByResidents: number;
}

export type ReporterContributionType = 'primary_report' | 'me_too' | 'verify_fix';

export interface ReporterContactRecord {
  id: string;
  reportId: string;
  reportTitle: string;
  wardId: string;
  wardNumber: number;
  municipalityCode: MunicipalityCode;
  categoryId: ServiceCategoryId;
  status: ReportStatus;
  reporterName: string;
  mobileNumber: string;
  normalizedMobile: string;
  contributionType: ReporterContributionType;
  pointsEarned: number;
  pointsClaimed: boolean;
  createdAtIso: string;
  municipalRef: string | null;
  address: string;
}

export interface CouncillorReporterGroup {
  normalizedMobile: string;
  displayMobile: string;
  reporterNames: string[];
  reportCount: number;
  meTooCount: number;
  verifyCount: number;
  totalPoints: number;
  unclaimedPoints: number;
  lastReportedAtIso: string;
  reports: Array<{
    reportId: string;
    title: string;
    wardId: string;
    wardNumber: number;
    categoryId: ServiceCategoryId;
    status: ReportStatus;
    municipalRef: string | null;
    address: string;
    contributionType: ReporterContributionType;
    pointsEarned: number;
    pointsClaimed: boolean;
    createdAtIso: string;
  }>;
}

export interface CouncillorAnalyticsSummary {
  ok: boolean;
  wardId: string;
  totalReports: number;
  openReports: number;
  resolvedReports: number;
  slaBreachedReports: number;
  uniqueReporterNumbers: number;
  totalContactSubmissions: number;
  unclaimedPointsTotal: number;
  byCategory: Array<{ categoryId: ServiceCategoryId; count: number; openCount: number }>;
  reportersByMobile: CouncillorReporterGroup[];
  submissions: ReporterContactRecord[];
}

export interface SignalDeskWardAnalytics {
  ok: boolean;
  source: 'signal-desk-analytics' | 'local-fallback';
  wardNumber: number;
  fetchedAtIso: string;
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  bySuburb: Record<string, number>;
  byMonth: Record<string, number>;
  daily: Array<{ date: string; count: number }>;
  weeklyTrend: Array<{ week: string; count: number }>;
  timeOfDay: Array<{ hour: number; count: number }>;
  resolutionByCategory: Array<{ category: string; hours: number }>;
  providerResponse: Array<{ provider: string; avgHours: number }>;
  hotspotStreets: Array<{ street: string; count: number }>;
  openVsResolved: { open: number; resolved: number };
  avgResolutionHours: number;
  avgDaysOpen: number;
  buckets?: { withRef: number; withoutRef: number; resolved: number };
  tiles?: {
    statusBreakdown?: Record<string, number>;
    totalNonDismissed?: number;
    reportsToday?: number;
    resolvedToday?: number;
    avgResolutionHours?: number;
  };
  reference: {
    withRef: number;
    withoutRef: number;
    pctWithRef: number;
    byCategory: Record<string, { withRef: number; withoutRef: number }>;
    bySuburb?: Record<string, { withRef: number; withoutRef: number }>;
  };
}

export interface SocialPulseItem {
  id: string;
  platform: 'WhatsApp' | 'Telegram' | 'X' | 'Facebook';
  sourceChannel: string;
  wardId: string;
  municipalityCode: MunicipalityCode;
  wardNumber: number;
  authorHandle: string;
  message: string;
  timestampLabel: string;
  linkedReportId: string | null;
  linkedRef: string | null;
  clusteredCount: number;
  aiSummary: string;
  entityTags: string[];
}

export interface RewardTransaction {
  id: string;
  title: string;
  subtitle: string;
  points: number;
  timestampLabel: string;
  type: 'earn' | 'redeem';
}

export interface RewardOffer {
  id: string;
  partner: string;
  title: string;
  description: string;
  costCredits: number;
  category: string;
}

export type AuthChannel = 'google' | 'whatsapp' | 'telegram' | 'email_za';

export interface UserProfile {
  name: string;
  emailOrHandle: string;
  mobileZa: string;
  authChannel: AuthChannel;
  signedIn: boolean;
  homeWardId: string;
  activeWardId: string;
  awayFromHome: boolean;
  credits: number;
  tier: string;
}

export interface MonthlyMunicipalBill {
  monthKey: string;
  monthLabel: string;
  waterZar: number;
  waterKl: number;
  electricityZar: number;
  electricityKwh: number;
  ratesZar: number;
  municipalTaxesZar: number; // Refuse, sewerage & city surcharge levies
}

export interface TownWardBillBenchmark {
  id: string;
  label: string;
  townOrMetro: string;
  wardLabel: string;
  waterZar: number;
  electricityZar: number;
  ratesZar: number;
  municipalTaxesZar: number;
  waterTariffPerKl: number;
  elecTariffPerKwh: number;
  slaResolutionScore: number;
}

export type UserRole = 'resident' | 'councillor';

export type AppView =
  | 'hub'
  | 'feed'
  | 'map'
  | 'desk'
  | 'social'
  | 'directory'
  | 'rewards'
  | 'profile';
