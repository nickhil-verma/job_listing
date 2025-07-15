// api/index.js
import { connectDB } from "../db/db";
import { jobRoutes } from "../routes/api";
import { createRouter } from "next-connect"; // lightweight middleware

const router = createRouter();

router.get(jobRoutes.getJobs);
router.post(jobRoutes.postJobs);

export default async function handler(req, res) {
  await connectDB(); // ensure DB connection (cached)
  return router.run(req, res);
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb", // large payloads supported
    },
  },
};
