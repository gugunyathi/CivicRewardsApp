import { recordVerification } from '../../server-store';
import type { MunicipalityCode, ServiceCategoryId } from '../../src/types/civic';

export default function handler(req: any, res: any) {
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
