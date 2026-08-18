import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    location: { type: String, default: "Remote", trim: true },
    url: { type: String, unique: true, sparse: true, trim: true },
    source: { type: String, required: true, trim: true }, // e.g. "Telegram Referral", "LinkedIn"
    postedAt: { type: Date },
    employmentType: { type: String, trim: true }, // e.g. "Full-time", "Contract", "Part-time"
    experienceRequired: { type: String, trim: true }, // e.g. "3+ years", "Junior"
    skillsRequired: [{ type: String, trim: true }],
    referralAvailable: { type: Boolean, default: false },
    referralDetails: {
      postId: { type: String, trim: true },
      channelName: { type: String, trim: true },
      contactUser: { type: String, trim: true },
    },
    // De-duplication fields
    dedupHash: { type: String, unique: true, sparse: true }, // custom hash generated during normalization
    telegramMessageId: { type: String, unique: true, sparse: true },
    normalizedTitle: { type: String, lowercase: true, trim: true },
    normalizedCompany: { type: String, lowercase: true, trim: true },
  },
  { timestamps: true }
);

// Indexes
jobSchema.index({ title: "text", company: "text" }); // text search capability
jobSchema.index({ source: 1 });
jobSchema.index({ postedAt: -1 });

export const Job = mongoose.model("Job", jobSchema);
export default Job;
