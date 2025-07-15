// api/jobs.js

import { connectDB } from "../db/db";
import { jobRoutes } from "../routes/api";
import { createRouter } from "next-connect";

// Create a Next.js-compatible router
const router = createRouter();

// Attach route handlers
router.get(jobRoutes.getJobs);
router.post(jobRoutes.postJobs);

// Serverless function handler
export default async function handler(req, res) {
  await connectDB(); // Ensure DB connection (cached in serverless env)
  return router.run(req, res); // Execute routes
}

// Allow large payloads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb",
    },
  },
};
