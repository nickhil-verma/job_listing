// routes/api.js
import { Job } from "../db/models.js"

export const jobRoutes = {
  // GET /jobs
  getJobs: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;

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
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // POST /jobs
  postJobs: async (req, res) => {
    try {
      const payload = Array.isArray(req.body) ? req.body : [req.body];
      const urls = payload.map((j) => j.apply_url);

      const existing = await Job.find({ apply_url: { $in: urls } }).select("apply_url");
      const existingUrls = new Set(existing.map((j) => j.apply_url));

      const docsToInsert = payload.filter((j) => !existingUrls.has(j.apply_url));

      if (docsToInsert.length) {
        await Job.insertMany(docsToInsert, { ordered: false });
      }

      res.json({
        added: docsToInsert.length,
        skipped: payload.length - docsToInsert.length,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};
