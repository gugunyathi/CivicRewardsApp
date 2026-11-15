import { recordRewardRedemption } from '../../server-store';

export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { offerId, costCredits, title, userPhone } = (req.body ?? {}) as {
    offerId?: string;
    costCredits?: number;
    title?: string;
    userPhone?: string;
  };
  if (!offerId || typeof costCredits !== 'number') {
    res.status(400).json({ error: 'Missing offerId or costCredits' });
    return;
  }
  const record = recordRewardRedemption({ offerId, costCredits, title, userPhone });
  res.json({
    ok: true,
    voucherCode: record.voucherCode,
    offerId: record.offerId,
    title: record.title,
    costCredits: record.costCredits,
    recipient: record.recipient,
    issuedAtIso: record.issuedAtIso,
    expiresAtIso: record.expiresAtIso,
  });
}
