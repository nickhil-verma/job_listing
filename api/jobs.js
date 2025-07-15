// api/jobs.js
import { connectDB } from '../db/db.js';
import { jobRoutes } from '../routes/api.js';

export default async function handler(req, res) {
  try {
    await connectDB();

    if (req.method === 'GET') {
      return jobRoutes.getJobs(req, res);
    } else if (req.method === 'POST') {
      return jobRoutes.postJobs(req, res);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (err) {
    console.error('API Handler Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
