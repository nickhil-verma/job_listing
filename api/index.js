import { connectDB } from '../db/db.js';
import { jobRoutes } from '../routes/api.js';
import { parse } from 'url';

const getRequestBody = async (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk.toString()));
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
  });
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    await connectDB();

    const parsed = parse(req.url, true); // 🛠️ Parse pathname safely
    const pathname = parsed.pathname;
    const method = req.method;

    // ✅ Route: GET /
    if (pathname === "/" && method === "GET") {
      return res.status(200).json({
        message: "🌍 Job Listing API is live!",
        endpoints: ["/jobs (GET, POST)", "/jobsbyids (POST)"],
        timestamp: new Date().toISOString(),
      });
    }

    // ✅ GET /jobs
    if (pathname === "/jobs" && method === "GET") {
      return jobRoutes.getJobs(req, res);
    }

    // ✅ POST /jobs
    if (pathname === "/jobs" && method === "POST") {
      req.body = await getRequestBody(req);
      return jobRoutes.postJobs(req, res);
    }

    // ✅ POST /jobsbyids
    if (pathname === "/jobsbyids" && method === "POST") {
      req.body = await getRequestBody(req);
      return jobRoutes.jobsByIds(req, res);
    }

    // ❌ Unknown path/method
    return res.status(404).json({ error: `Route ${method} ${pathname} not found` });

  } catch (err) {
    console.error("❌ API Handler Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
