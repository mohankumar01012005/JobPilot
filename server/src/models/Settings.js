import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    jobScanningEnabled: { type: Boolean, default: true },
    applicationAutomationEnabled: { type: Boolean, default: false },
    dailyApplicationLimit: { type: Number, default: 10, min: 0 },
    hourlyApplicationLimit: { type: Number, default: 2, min: 0 },
    minMatchScore: { type: Number, default: 70, min: 0, max: 100 },
    enabledSources: [
      { type: String, default: ["Telegram", "LinkedIn", "Indeed"] },
    ],
    preferredJobSettings: {
      locations: [{ type: String, trim: true }],
      roles: [{ type: String, trim: true }],
      jobTypes: [{ type: String, trim: true }],
    },
    automationSettings: {
      captchaProvider: { type: String, default: "anticaptcha", trim: true },
      fallbackToLuna: { type: Boolean, default: false },
      maxRetries: { type: Number, default: 3 },
    },
  },
  { timestamps: true }
);

/**
 * Static helper method to fetch the singleton settings document.
 * If no document exists in the collection, it will automatically create and return the default setup.
 */
settingsSchema.statics.getSingleton = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export const Settings = mongoose.model("Settings", settingsSchema);
export default Settings;
