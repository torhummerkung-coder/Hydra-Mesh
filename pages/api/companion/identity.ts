import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'node:crypto';
import { SESSION_COOKIE_NAME, verifySessionToken } from '../../../lib/session';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).end();
  const token = req.cookies[SESSION_COOKIE_NAME];
  const session = token ? await verifySessionToken(token) : null;
  if (!session || session.role !== 'patient') return res.status(401).json({ success: false });
  return res.json({ success: true, scope: createHash('sha256').update(`hydra-browser:${session.sub}`).digest('hex') });
}
