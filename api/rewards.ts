// api/rewards.ts – consolidated Vercel serverless function.
// Serves: GET /api/rewards/pending, POST /api/rewards/claim, POST /api/rewards/redeem
// (see vercel.json rewrites, which map the nested paths here).
import {
  claimRewardsForMobile,
  getPendingRewardsForMobile,
  recordRewardRedemption,
} from '../server-store';

function handlePending(req: any, res: any) {
  const mobile = String(req.query?.mobile || '').trim();
  if (!mobile) {
    res.status(400).json({ error: 'Missing mobile query parameter.' });
    return;
  }
  const result = getPendingRewardsForMobile(mobile);
  if (!result.ok) {
    res.status(400).json({ error: 'Enter a valid South African mobile number.' });
    return;
  }
  res.json(result);
}

function handleClaim(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const mobile = String(req.body?.mobile || '').trim();
  if (!mobile) {
    res.status(400).json({ error: 'Mobile number is required to claim pending credits.' });
    return;
  }
  const result = claimRewardsForMobile(mobile);
  if (!result.ok) {
    res.status(400).json({ error: 'Enter a valid South African mobile number.' });
    return;
  }
  res.json(result);
}

function handleRedeem(req: any, res: any) {
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

export default function handler(req: any, res: any) {
  const action = String(req.query?.action || '');
  if (action === 'pending') {
    handlePending(req, res);
    return;
  }
  if (action === 'claim') {
    handleClaim(req, res);
    return;
  }
  if (action === 'redeem') {
    handleRedeem(req, res);
    return;
  }
  res.status(404).json({ error: `Unknown rewards action: ${action || '(missing)'}` });
}
