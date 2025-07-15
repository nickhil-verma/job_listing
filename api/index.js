import { connectDB } from '../db/db.js';
import { Job } from '../db/models.js';

export default async function handler(req, res) {
  // ✅ CORS setup
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    await connectDB();

    const { url, method } = req;

    // ✅ Route: GET /
    if (url === "/" && method === "GET") {
      return res.status(200).json({
        message: "🌍 Job Listing API is live!",
        endpoints: ["/jobs (GET, POST)"],
        timestamp: new Date().toISOString(),
      });
    }

    // ✅ Route: GET /jobs
    if (url === "/jobs" && method === "GET") {
      const page = parseInt(req.query?.page) || 1;
      const limit = parseInt(req.query?.limit) || 100;

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
    }

    // ✅ Route: POST /jobs
    if (url === "/jobs" && method === "POST") {
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
    }

    // ❌ Unknown path/method
    return res.status(404).json({ error: `Route ${method} ${url} not found` });

  } catch (err) {
    console.error("❌ API Handler Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
