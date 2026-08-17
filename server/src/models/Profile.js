import mongoose from "mongoose";

const experienceSchema = new mongoose.Schema({
  company: { type: String, required: true, trim: true },
  role: { type: String, required: true, trim: true },
  startDate: { type: Date },
  endDate: { type: Date },
  current: { type: Boolean, default: false },
  description: { type: String, trim: true },
});

const educationSchema = new mongoose.Schema({
  institution: { type: String, required: true, trim: true },
  degree: { type: String, trim: true },
  fieldOfStudy: { type: String, trim: true },
  startDate: { type: Date },
  endDate: { type: Date },
  description: { type: String, trim: true },
});

const portfolioLinkSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true },
});

const profileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },
    location: { type: String, trim: true },
    skills: [{ type: String, trim: true }],
    experience: [experienceSchema],
    education: [educationSchema],
    preferredRoles: [{ type: String, trim: true }],
    preferredLocations: [{ type: String, trim: true }],
    preferredJobTypes: [{ type: String, trim: true }], // e.g. ["Full-time", "Remote"]
    portfolioLinks: [portfolioLinkSchema],
    jobSearchPreferences: {
      minSalary: { type: Number },
      currency: { type: String, default: "USD", trim: true },
      workAuthorization: { type: String, trim: true },
      industries: [{ type: String, trim: true }],
    },
  },
  { timestamps: true }
);

export const Profile = mongoose.model("Profile", profileSchema);
export default Profile;
