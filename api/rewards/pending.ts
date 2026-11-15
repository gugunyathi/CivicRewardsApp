import { getPendingRewardsForMobile } from '../../server-store';

export default function handler(req: any, res: any) {
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
