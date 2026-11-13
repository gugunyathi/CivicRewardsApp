export type MunicipalityCode = 'CoJ' | 'CoCT' | 'CoT' | 'eThekwini';

export type ServiceCategoryId =
  | 'water'
  | 'electricity'
  | 'roads'
  | 'streetlights'
  | 'waste'
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
  timeAgoLabel: string;
  slaDeadlineHours: number;
  slaElapsedHours: number;
  assignedDepot: string;
  reporterName: string;
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

export type AppView =
  | 'hub'
  | 'feed'
  | 'map'
  | 'desk'
  | 'social'
  | 'directory'
  | 'rewards'
  | 'profile';
