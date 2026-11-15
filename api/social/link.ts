import { recordSocialLinkEvent } from '../../server-store';

export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body =
    typeof req.body === 'string'
      ? JSON.parse(req.body || '{}')
      : (req.body ?? {});

  const { platform, wardId, linkedReportId, linkedRef } = body as {
    platform?: string;
    wardId?: string;
    linkedReportId?: string | null;
    linkedRef?: string | null;
  };

  recordSocialLinkEvent({
    platform: platform || 'WhatsApp',
    wardId: wardId || 'CoJ-115',
    linkedReportId,
    linkedRef,
  });

  res.status(200).json({ ok: true });
}
