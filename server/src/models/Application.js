import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    selectedResume: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "draft",
        "applied",
        "interviewing",
        "offered",
        "rejected",
        "failed",
        "manual_action_required",
      ],
      default: "draft",
    },
    applicationUrl: { type: String, trim: true },
    source: { type: String, required: true }, // e.g. "LinkedIn Easy Apply", "Indeed", "Direct Form"
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
    failureReason: { type: String, trim: true },
    captchaRequired: { type: Boolean, default: false },
    notes: { type: String, trim: true },
    automationLog: [
      {
        timestamp: { type: Date, default: Date.now },
        action: { type: String, trim: true },
        details: { type: String, trim: true },
      },
    ],
  },
  { timestamps: true }
);

// Indexes for job search tracking and analytical dashboard queries
applicationSchema.index({ status: 1 });
applicationSchema.index({ job: 1 });
applicationSchema.index({ selectedResume: 1 });

export const Application = mongoose.model("Application", applicationSchema);
export default Application;
