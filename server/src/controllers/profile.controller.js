import { Profile } from "../models/index.js";

/**
 * Regex helper to validate email patterns.
 */
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * GET /api/profile
 * Retrieves the owner's profile document.
 */
export const getProfile = async (req, res, next) => {
  try {
    const profile = await Profile.findOne();
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found. Please create one using POST.",
      });
    }

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/profile
 * Creates the single user's profile.
 * Rejects with 409 Conflict if a profile document already exists.
 */
export const createProfile = async (req, res, next) => {
  try {
    const existingProfile = await Profile.findOne();
    if (existingProfile) {
      return res.status(409).json({
        success: false,
        message: "Profile already exists. Use PUT /api/profile to update it.",
      });
    }

    const {
      name,
      email,
      phone,
      location,
      skills,
      experience,
      education,
      preferredRoles,
      preferredLocations,
      preferredJobTypes,
      portfolioLinks,
      jobSearchPreferences,
    } = req.body;

    // Validate request data
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Name is required." });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format." });
    }

    const newProfile = new Profile({
      name,
      email,
      phone,
      location,
      skills,
      experience,
      education,
      preferredRoles,
      preferredLocations,
      preferredJobTypes,
      portfolioLinks,
      jobSearchPreferences,
    });

    await newProfile.save();

    res.status(201).json({
      success: true,
      message: "Profile created successfully.",
      data: newProfile,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A profile with this email already exists.",
      });
    }
    next(error);
  }
};

/**
 * PUT /api/profile
 * Modifies the single user's profile.
 */
export const updateProfile = async (req, res, next) => {
  try {
    const profile = await Profile.findOne();
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found. Please create one first using POST.",
      });
    }

    const {
      name,
      email,
      phone,
      location,
      skills,
      experience,
      education,
      preferredRoles,
      preferredLocations,
      preferredJobTypes,
      portfolioLinks,
      jobSearchPreferences,
    } = req.body;

    // Validate request data if fields are provided
    if (name !== undefined && (!name || !name.trim())) {
      return res.status(400).json({ success: false, message: "Name cannot be empty." });
    }
    if (email !== undefined) {
      if (!email || !email.trim()) {
        return res.status(400).json({ success: false, message: "Email cannot be empty." });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ success: false, message: "Invalid email format." });
      }
    }

    // Set updated values
    if (name !== undefined) profile.name = name;
    if (email !== undefined) profile.email = email;
    if (phone !== undefined) profile.phone = phone;
    if (location !== undefined) profile.location = location;
    if (skills !== undefined) profile.skills = skills;
    if (experience !== undefined) profile.experience = experience;
    if (education !== undefined) profile.education = education;
    if (preferredRoles !== undefined) profile.preferredRoles = preferredRoles;
    if (preferredLocations !== undefined) profile.preferredLocations = preferredLocations;
    if (preferredJobTypes !== undefined) profile.preferredJobTypes = preferredJobTypes;
    if (portfolioLinks !== undefined) profile.portfolioLinks = portfolioLinks;
    if (jobSearchPreferences !== undefined) profile.jobSearchPreferences = jobSearchPreferences;

    await profile.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: profile,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A profile with this email already exists.",
      });
    }
    next(error);
  }
};
