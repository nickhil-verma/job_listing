// api/jobs.js
import { connectDB } from '../db/db.js';
import { jobRoutes } from '../routes/api.js';

export default async function handler(req, res) {
  await connectDB();

  if (req.method === 'GET') {
    return jobRoutes.getJobs(req, res);
  } else if (req.method === 'POST') {
    return jobRoutes.postJobs(req, res);
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
