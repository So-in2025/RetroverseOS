import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    console.log('[Sentinel Report] [Vercel]', JSON.stringify(req.body));
    return res.status(202).json({ status: "received", platform: "vercel" });
  }
  res.status(405).json({ error: "Method not allowed" });
}
