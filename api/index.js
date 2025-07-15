// api/jobs.js
import { connectDB } from "../db/db";
import { jobRoutes } from "../routes/api";
import { createRouter } from "next-connect";

const router = createRouter();

router.get(jobRoutes.getJobs);
router.post(jobRoutes.postJobs);

export default async function handler(req, res) {
  await connectDB();
  return router.run(req, res);
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb",
    },
  },
};
