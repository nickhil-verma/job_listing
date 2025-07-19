// routes/api.js
import { Job } from "../db/models.js";
import { parse } from "url";

const sanitizeJob = (job) => ({
  ...job,
  job_title: job.job_title?.trim(),
  job_description: job.job_description?.trim(),
  apply_url: job.apply_url?.trim(),
  company_image: job.company_image?.trim(),
  location: job.location?.trim(),
  experience: job.experience?.trim(),
  job_type: job.job_type?.trim()?.toLowerCase(),
  work_mode: job.work_mode?.trim()?.toLowerCase(),
  skills: Array.isArray(job.skills)
    ? job.skills.map((s) => s.trim().toLowerCase())
    : [],
});

const isValidJob = (job) =>
  job.job_title &&
  job.apply_url &&
  typeof job.apply_url === "string" &&
  job.apply_url.startsWith("http");

export const jobRoutes = {
  // GET /jobs?page=1&limit=100
  getJobs: async (req, res) => {
    try {
      const { query } = parse(req.url, true);
      const page = Math.max(parseInt(query.page) || 1, 1);
      const limit = Math.min(parseInt(query.limit) || 100, 1000); // prevent abuse

      const jobs = await Job.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await Job.countDocuments();

      res.json({
        jobs,
        total,
        page,
        pages: Math.ceil(total / limit),
      });
    } catch (err) {
      console.error("Error in getJobs:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // POST /jobs
  postJobs: async (req, res) => {
    try {
      const payload = Array.isArray(req.body) ? req.body : [req.body];

      const sanitizedPayload = payload.map(sanitizeJob);
      const validPayload = sanitizedPayload.filter(isValidJob);

      const urls = validPayload.map((j) => j.apply_url);
      const existing = await Job.find({ apply_url: { $in: urls } }).select("apply_url");
      const existingUrls = new Set(existing.map((j) => j.apply_url));

      const docsToInsert = validPayload.filter((j) => !existingUrls.has(j.apply_url));

      if (docsToInsert.length) {
        try {
          await Job.insertMany(docsToInsert, { ordered: false });
        } catch (insertErr) {
          console.error("Insert error:", insertErr);
        }
      }

      res.json({
        added: docsToInsert.length,
        skipped: payload.length - docsToInsert.length,
        duplicates: validPayload
          .map((j) => j.apply_url)
          .filter((url) => existingUrls.has(url)),
      });
    } catch (err) {
      console.error("Error in postJobs:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};
