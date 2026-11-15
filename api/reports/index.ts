import { listReports, saveSubmittedReport } from '../../server-store';
import type { CivicReport } from '../../src/types/civic';

export default function handler(req: any, res: any) {
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
