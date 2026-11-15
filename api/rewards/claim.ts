import { claimRewardsForMobile } from '../../server-store';

export default function handler(req: any, res: any) {
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
