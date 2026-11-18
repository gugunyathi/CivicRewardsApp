import type {
  CivicReport,
  CouncillorAnalyticsSummary,
  MunicipalityCode,
  ReporterContactRecord,
  ReportStatus,
  RewardTransaction,
  ServiceCategoryId,
  SignalDeskWardAnalytics,
  UserRole,
} from '../types/civic';

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `API request failed (${res.status})`);
  }
  return data;
}

export const civicApi = {
  fetchReports: (params?: { ward?: string; status?: string; q?: string; role?: UserRole }) => {
    const qs = new URLSearchParams();
    if (params?.ward) qs.set('ward', params.ward);
    if (params?.status) qs.set('status', params.status);
    if (params?.q) qs.set('q', params.q);
    if (params?.role) qs.set('role', params.role);
    const query = qs.toString();
    return apiJson<{ ok: boolean; count: number; reports: CivicReport[] }>(
      `/api/reports${query ? `?${query}` : ''}`
    );
  },

  createReport: (payload: {
    report: CivicReport;
    reporterPhone?: string | null;
    signedIn: boolean;
    potentialPoints: number;
  }) =>
    apiJson<{
      ok: boolean;
      report: CivicReport;
      contactRecord: ReporterContactRecord | null;
      pendingCreditsForMobile: number;
    }>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  patchReport: (
    reportId: string,
    patch: {
      status?: ReportStatus;
      municipalRef?: string;
      escalationNote?: string;
      approveStrippedMedia?: boolean;
      sendSlaReminder?: boolean;
    }
  ) =>
    apiJson<{ ok: boolean; reportId: string; report: CivicReport | null }>(
      `/api/reports/${encodeURIComponent(reportId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }
    ),

  corroborateReport: (payload: {
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
  }) =>
    apiJson<{
      ok: boolean;
      reportId: string;
      clusteredHouseholds: number | null;
      contactRecord: ReporterContactRecord | null;
      pendingCreditsForMobile: number;
      creditsEarned: number;
    }>('/api/reports/corroborate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  verifyResolution: (payload: {
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
  }) =>
    apiJson<{
      ok: boolean;
      reportId: string;
      creditsEarned: number;
      remainingSeconds: number;
    }>('/api/reports/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  fetchCouncillorAnalytics: (wardId = 'ALL', search = '') => {
    const qs = new URLSearchParams();
    if (wardId) qs.set('wardId', wardId);
    if (search.trim()) qs.set('search', search.trim());
    return apiJson<CouncillorAnalyticsSummary>(`/api/councillor/analytics?${qs.toString()}`);
  },

  fetchSignalDeskAnalytics: (wardNumber = 115, refresh = false) => {
    const qs = new URLSearchParams({ ward: String(wardNumber) });
    if (refresh) qs.set('refresh', '1');
    return apiJson<SignalDeskWardAnalytics>(`/api/ward115/analytics?${qs.toString()}`);
  },

  fetchPendingRewards: (mobile: string) =>
    apiJson<{
      ok: boolean;
      normalizedMobile: string | null;
      displayMobile: string;
      pendingPoints: number;
      claimedPoints: number;
      pendingCount: number;
      records: ReporterContactRecord[];
    }>(`/api/rewards/pending?mobile=${encodeURIComponent(mobile)}`),

  claimRewardsByMobile: (mobile: string) =>
    apiJson<{
      ok: boolean;
      normalizedMobile: string | null;
      claimedPoints: number;
      claimedCount: number;
      transactions: RewardTransaction[];
    }>('/api/rewards/claim', {
      method: 'POST',
      body: JSON.stringify({ mobile }),
    }),

  redeemReward: (payload: {
    offerId: string;
    costCredits: number;
    title: string;
    userPhone?: string;
  }) =>
    apiJson<{
      ok: boolean;
      voucherCode: string;
      offerId: string;
      title: string;
      costCredits: number;
      issuedAtIso: string;
      expiresAtIso: string;
    }>('/api/rewards/redeem', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  recordSocialLink: (payload: {
    platform: string;
    wardId: string;
    linkedReportId?: string | null;
    linkedRef?: string | null;
  }) =>
    apiJson<{ ok: boolean }>('/api/social/link', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
