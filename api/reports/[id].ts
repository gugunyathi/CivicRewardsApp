import { patchReportRecord } from '../../server-store';
import type { ReportStatus } from '../../src/types/civic';

export default function handler(req: any, res: any) {
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
