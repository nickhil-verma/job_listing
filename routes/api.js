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
      const limit = Math.min(parseInt(query.limit) || 9, 1000); // Default to 9 as per frontend, prevent abuse
      const searchTerm = query.q ? query.q.trim() : '';
      const sortOrder = query.sort || 'latest'; // 'latest' or 'oldest'

      // Filter parameters
      const experienceFilter = query.experience ? query.experience.trim() : '';
      const locationFilter = query.location ? query.location.trim() : '';
      const roleTypeFilter = query.roleType ? query.roleType.trim().toLowerCase() : '';
      const jobTypeFilter = query.jobType ? query.jobType.trim().toLowerCase() : ''; // This maps to work_mode
      const skillsFilter = query.skills ? query.skills.split(',').map(s => s.trim().toLowerCase()).filter(s => s) : [];

      // Build the Mongoose query object
      let findQuery = {};

      // 1. Search Term (q) for title, description, location
      if (searchTerm) {
        const searchRegex = new RegExp(searchTerm, 'i'); // Case-insensitive search
        findQuery.$or = [
          { job_title: { $regex: searchRegex } },
          { job_description: { $regex: searchRegex } },
          { location: { $regex: searchRegex } },
        ];
      }

      // 2. Experience Filter
      // This is a simple direct match. For range queries (e.g., "1-3 years"),
      // your database schema or a more complex parsing logic would be needed.
      // Assuming 'experience' field in DB is exactly '1-3 years', '3-5 years', etc.
      if (experienceFilter) {
        findQuery.experience = experienceFilter;
      }

      // 3. Location Filter
      if (locationFilter) {
        findQuery.location = { $regex: new RegExp(locationFilter, 'i') };
      }

      // 4. Role Type Filter (assuming you add a 'role_type' field to your schema later,
      // or infer it from job_title/description with more complex logic)
      // For now, I'll demonstrate by looking for keywords in title/description.
      // **IMPORTANT**: If you have a dedicated `role_type` field in your `Job` model, use it directly.
      if (roleTypeFilter) {
        const roleRegex = new RegExp(roleTypeFilter, 'i');
        // This is a simplistic approach. A dedicated 'role_type' field is better.
        if (findQuery.$or) {
             // If $or already exists for searchTerm, combine them
            findQuery.$and = findQuery.$and || [];
            findQuery.$and.push({ $or: [
                { job_title: { $regex: roleRegex } },
                { job_description: { $regex: roleRegex } }
            ]});
        } else {
            findQuery.$or = [
                { job_title: { $regex: roleRegex } },
                { job_description: { $regex: roleRegex } }
            ];
        }
      }

      // 5. Job Type Filter (maps to work_mode in your schema)
      if (jobTypeFilter) {
        findQuery.work_mode = jobTypeFilter;
      }

      // 6. Skills Filter
      if (skillsFilter.length > 0) {
        // Using $all for exact match of ALL provided skills in the array
        // If you want jobs that contain ANY of the skills, use $in: skillsFilter
        // For partial matches within skill strings, you'd need $regex for each skill or text indexing.
        // Assuming `skills` in DB is an array of strings, we use $all to find documents
        // that contain ALL specified skills. If you want ANY of the skills, change to $in.
        findQuery.skills = { $all: skillsFilter };
      }

      // Count total documents matching the filters
      const totalFilteredJobs = await Job.countDocuments(findQuery);

      // Determine sort order
      let sortOptions = {};
      if (sortOrder === 'latest') {
        sortOptions.createdAt = -1; // Newest first
      } else if (sortOrder === 'oldest') {
        sortOptions.createdAt = 1; // Oldest first
      }
      // If a search term is present, you might want to sort by relevance first,
      // but Mongoose's text search for relevance requires an index and specific syntax.
      // For now, it will primarily sort by createdAt.

      // Fetch jobs with filters, sort, skip, and limit
      const jobs = await Job.find(findQuery)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit);

      res.json({
        jobs: jobs,
        total: totalFilteredJobs, // This is the total count of filtered jobs
        page: page,
        pages: Math.ceil(totalFilteredJobs / limit), // Calculate pages based on filtered total
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