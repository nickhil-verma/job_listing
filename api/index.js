// api/jobs.js
import { connectDB } from '../db/db.js';
import { Job } from '../db/models.js';

export default async function handler(req, res) {
  // ✅ Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    await connectDB();

    if (req.method === 'GET') {
      // Paginated job listings
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;

      const jobs = await Job.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await Job.countDocuments();

      return res.status(200).json({
        jobs,
        total,
        page,
        pages: Math.ceil(total / limit),
      });

    } else if (req.method === 'POST') {
      // Bulk or single insert
      const payload = Array.isArray(req.body) ? req.body : [req.body];
      const urls = payload.map((j) => j.apply_url);

      const existing = await Job.find({ apply_url: { $in: urls } }).select("apply_url");
      const existingUrls = new Set(existing.map((j) => j.apply_url));

      const docsToInsert = payload.filter((j) => !existingUrls.has(j.apply_url));

      if (docsToInsert.length) {
        await Job.insertMany(docsToInsert, { ordered: false });
      }

      return res.status(200).json({
        added: docsToInsert.length,
        skipped: payload.length - docsToInsert.length,
      });

    } else {
      res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

  } catch (err) {
    console.error('❌ API Handler Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default function handler(req, res) {
  res.status(200).json({ message: "🌍 Hello from Vercel root route!" });
}
