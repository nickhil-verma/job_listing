import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    job_title: { type: String, required: true },
    job_description: { type: String },
    apply_url: { type: String, required: true, unique: true },
    company_image: String,
    date_posted: { type: Date, default: Date.now },
    
    // New fields added
    location: { type: String },
    skills: { type: [String] },
    work_mode: { type: String, enum: ["onsite", "remote", "hybrid"] }, // renamed to avoid confusion with job_type below
    experience: { type: String }, // e.g., "0-2 years", "3+ years"
    job_type: { type: String, enum: ["part time", "full time"] },
  },
  { timestamps: true }
);

// Auto-delete after ~60 days
jobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

export const Job = mongoose.models.Job || mongoose.model("Job", jobSchema);
