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
  job_type: job.job_type?.trim()?.toLowerCase(), // Ensure consistency
  work_mode: job.work_mode?.trim()?.toLowerCase(), // Ensure consistency
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
  // GET /jobs?page=1&limit=100&q=software&skills=react,node&experience=1-3 years&location=bangalore&roleType=engineering&jobType=remote&sort=latest
  getJobs: async (req, res) => {
  try {
    const { query } = parse(req.url, true);
    const page = Math.max(parseInt(query.page) || 1, 1);
    const limit = Math.min(parseInt(query.limit) || 9, 1000);
    const searchTerm = query.q?.trim() || '';
    const sortOrder = query.sort || 'latest';

    // Filter params
    const experienceInput = query.experience ? query.experience.trim() : '';
    const locationInput = query.location ? query.location.trim().toLowerCase() : '';
    const roleType = query.roleType ? query.roleType.trim().toLowerCase() : '';
    const jobType = query.jobType ? query.jobType.trim().toLowerCase() : '';
    const skillsInput = query.skills
      ? query.skills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      : [];

    const findQuery = {};

    // Search Term across multiple fields
    if (searchTerm) {
      const regex = new RegExp(searchTerm, 'i');
      findQuery.$or = [
        { job_title: { $regex: regex } },
        { job_description: { $regex: regex } },
        { location: { $regex: regex } }
      ];
    }

    // Location - flexible match including broader regions
    if (locationInput) {
      const locRegex = new RegExp(locationInput, 'i');
      findQuery.location = { $regex: locRegex };
    }

    // Experience filtering (e.g., input "2" matches "1-3 years" or "2+ years")
    if (experienceInput) {
      const userYears = parseInt(experienceInput.match(/\d+/)?.[0] || "0");

      // Custom filter in memory due to format inconsistency
      const allJobs = await Job.find(); // Later apply filters in memory
      const matchedJobs = allJobs.filter(job => {
        const jobExp = job.experience || '';
        const expMatch = jobExp.match(/(\d+)(?:\s*-\s*(\d+))?/);
        if (!expMatch) return false;

        const minExp = parseInt(expMatch[1]);
        const maxExp = expMatch[2] ? parseInt(expMatch[2]) : minExp;
        return userYears >= minExp;
      });

      // Filtered job IDs
      const ids = matchedJobs.map(job => job._id.toString());
      findQuery._id = { $in: ids };
    }

    // Skills - match any of the provided ones
    if (skillsInput.length > 0) {
      findQuery.skills = { $in: skillsInput };
    }

    // Job Type (full time / part time)
    if (jobType) {
      findQuery.job_type = { $regex: new RegExp(jobType, 'i') };
    }

    // Role Type - fuzzy match in title/description
    if (roleType) {
      const roleRegex = new RegExp(roleType, 'i');
      const roleFilter = {
        $or: [
          { job_title: { $regex: roleRegex } },
          { job_description: { $regex: roleRegex } }
        ]
      };

      if (findQuery.$or) {
        findQuery.$and = [{ $or: findQuery.$or }, roleFilter];
        delete findQuery.$or;
      } else {
        Object.assign(findQuery, roleFilter);
      }
    }

    const totalFilteredJobs = await Job.countDocuments(findQuery);
    const sortOptions = sortOrder === 'latest' ? { createdAt: -1 } : { createdAt: 1 };

    const jobs = await Job.find(findQuery)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      jobs,
      total: totalFilteredJobs,
      page,
      pages: Math.ceil(totalFilteredJobs / limit),
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