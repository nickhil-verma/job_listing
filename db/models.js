// db/models.js
import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    job_title: { type: String, required: true },
    job_description: { type: String },
    apply_url: { type: String, required: true, unique: true },
    company_image: String,
    date_posted: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Auto-delete after ~60 days
jobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

export const Job = mongoose.models.Job || mongoose.model("Job", jobSchema);
