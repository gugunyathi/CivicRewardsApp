import { getCouncillorAnalytics } from '../../server-store.js';

export default function handler(req: any, res: any) {
  const wardId = req.query?.wardId ? String(req.query.wardId) : 'ALL';
  const search = req.query?.search ? String(req.query.search) : '';
  res.json(getCouncillorAnalytics({ wardId, search }));
}
