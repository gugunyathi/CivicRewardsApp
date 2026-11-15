// api/reports.ts – consolidated Vercel serverless function.
// Serves: GET/POST /api/reports, PATCH /api/reports/:id,
// POST /api/reports/corroborate, POST /api/reports/verify
// (see vercel.json rewrites, which map the nested paths here).
import {
  listReports,
  patchReportRecord,
  recordCorroboration,
  recordVerification,
  saveSubmittedReport,
} from '../server-store.js';
import type { CivicReport, MunicipalityCode, ReportStatus, ServiceCategoryId } from '../src/types/civic.js';

function handleIndex(req: any, res: any) {
  if (req.method === 'GET') {
    const ward = req.query?.ward ? String(req.query.ward) : null;
    const status = req.query?.status ? String(req.query.status) : null;
    const category = req.query?.category ? String(req.query.category) : null;
    const q = req.query?.q ? String(req.query.q) : null;
    const includeContacts =
      req.query?.role === 'councillor' || req.query?.includeContacts === 'true';

    const reports = listReports({ ward, status, category, q }).map((r) =>
      includeContacts ? r : { ...r, reporterPhone: undefined, corroboratorPhones: undefined }
    );
    res.json({ ok: true, count: reports.length, reports });
    return;
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as {
      report?: CivicReport;
      reporterPhone?: string | null;
      signedIn?: boolean;
      potentialPoints?: number;
    };
    if (!body.report || !body.report.id || !body.report.title) {
      res.status(400).json({ error: 'Valid report payload with id and title is required.' });
      return;
    }
    const result = saveSubmittedReport(body.report, {
      reporterPhone: body.reporterPhone ?? body.report.reporterPhone ?? null,
      signedIn: Boolean(body.signedIn),
      potentialPoints: body.potentialPoints,
    });
    res.status(201).json({
      ok: true,
      report: result.report,
      contactRecord: result.contactRecord,
      pendingCreditsForMobile: result.pendingCreditsForMobile,
    });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}

function handlePatchById(req: any, res: any) {
  if (req.method !== 'PATCH' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const reportId = decodeURIComponent(String(req.query?.id || '')).trim();
  if (!reportId) {
    res.status(400).json({ error: 'Missing report ID.' });
    return;
  }
  const body = (req.body ?? {}) as {
    status?: ReportStatus;
    municipalRef?: string;
    escalationNote?: string;
    approveStrippedMedia?: boolean;
    sendSlaReminder?: boolean;
  };
  const result = patchReportRecord(reportId, body);
  res.json({ ok: true, reportId, report: result.report, override: result.override });
}

function handleCorroborate(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const body = (req.body ?? {}) as {
    reportId?: string;
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
  };
  if (!body.reportId) {
    res.status(400).json({ error: 'Missing reportId' });
    return;
  }
  const result = recordCorroboration({
    ...body,
    reportId: body.reportId,
  });
  res.json({
    ok: true,
    reportId: body.reportId,
    clusteredHouseholds: result.clusteredHouseholds,
    contactRecord: result.contactRecord,
    pendingCreditsForMobile: result.pendingCreditsForMobile,
    creditsEarned: body.signedIn ? 15 : 0,
  });
}

function handleVerify(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const body = (req.body ?? {}) as {
    reportId?: string;
    resolvedAtIso?: string;
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
  };
  if (!body.reportId) {
    res.status(400).json({ error: 'Missing reportId' });
    return;
  }
  const result = recordVerification({ ...body, reportId: body.reportId });
  if (!result.ok) {
    res.status(400).json({
      ok: false,
      error: result.error,
      elapsedMinutes: result.elapsedMinutes,
    });
    return;
  }
  res.json({
    ok: true,
    reportId: body.reportId,
    creditsEarned: 30,
    remainingSeconds: result.remainingSeconds,
    contactRecord: result.contactRecord,
  });
}

export default function handler(req: any, res: any) {
  if (req.query?.id) {
    handlePatchById(req, res);
    return;
  }
  const action = String(req.query?.action || '');
  if (!action) {
    handleIndex(req, res);
    return;
  }
  if (action === 'corroborate') {
    handleCorroborate(req, res);
    return;
  }
  if (action === 'verify') {
    handleVerify(req, res);
    return;
  }
  res.status(404).json({ error: `Unknown reports action: ${action}` });
}
