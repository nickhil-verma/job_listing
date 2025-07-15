import { connectDB } from '../db/db.js';
import { jobRoutes } from '../routes/api.js';

export default async function handler(req, res) {
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

    // ✅ Delegate GET /jobs
    if (url.startsWith("/jobs") && method === "GET") {
      return jobRoutes.getJobs(req, res);
    }

    // ✅ Delegate POST /jobs
    if (url === "/jobs" && method === "POST") {
      return jobRoutes.postJobs(req, res);
    }

    // ❌ Unknown path/method
    return res.status(404).json({ error: `Route ${method} ${url} not found` });

  } catch (err) {
    console.error("❌ API Handler Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
