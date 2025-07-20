import { connectDB } from '../db/db.js';
import { jobRoutes } from '../routes/api.js';

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
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectDB();
    req.body = await getRequestBody(req);
    return jobRoutes.jobsByIds(req, res);
  } catch (err) {
    console.error("Error in /jobsbyids:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
