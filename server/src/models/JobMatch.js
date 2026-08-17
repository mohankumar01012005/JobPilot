import mongoose from "mongoose";

const jobMatchSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    resume: { type: mongoose.Schema.Types.ObjectId, ref: "Resume", required: true },
    matchScore: { type: Number, required: true, min: 0, max: 100 },
    breakdown: {
      matchedSkills: [{ type: String }],
      missingSkills: [{ type: String }],
      matchedExperience: { type: Boolean, default: false },
      matchedKeywords: [{ type: String }],
    },
    aiAnalysis: {
      summary: { type: String },
      suitabilityReason: { type: String },
      gapsIdentified: [{ type: String }],
      recommendedCustomizations: { type: String }, // recommendations for resume edits
    },
    isSelectedResume: { type: Boolean, default: false }, // indicator for resume library selector
    decision: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Indexes to quickly find match rankings and unique job-resume matches
jobMatchSchema.index({ job: 1, resume: 1 }, { unique: true });
jobMatchSchema.index({ matchScore: -1 });
jobMatchSchema.index({ isSelectedResume: 1 });

export const JobMatch = mongoose.model("JobMatch", jobMatchSchema);
export default JobMatch;
