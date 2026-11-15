import { recordCorroboration } from '../../server-store';
import type { MunicipalityCode, ReportStatus, ServiceCategoryId } from '../../src/types/civic';

export default function handler(req: any, res: any) {
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
