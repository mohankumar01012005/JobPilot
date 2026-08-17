import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  url: { type: String, trim: true },
  technologies: [{ type: String, trim: true }],
});

const resumeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    filePath: { type: String, required: true, trim: true }, // References document storage path
    skills: [{ type: String, trim: true }],
    keywords: [{ type: String, trim: true }],
    technologies: [{ type: String, trim: true }],
    roles: [{ type: String, trim: true }],
    domains: [{ type: String, trim: true }],
    experience: [
      {
        company: { type: String, trim: true },
        role: { type: String, trim: true },
        duration: { type: String, trim: true }, // e.g. "Jan 2023 - Present" or duration summary
        description: { type: String, trim: true },
      },
    ],
    projects: [projectSchema],
    metadata: {
      fileSize: { type: Number },
      mimeType: { type: String, trim: true },
      parsedAt: { type: Date },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes for querying active resumes and filtering by skill keywords
resumeSchema.index({ isActive: 1 });
resumeSchema.index({ skills: 1 });

export const Resume = mongoose.model("Resume", resumeSchema);
export default Resume;
