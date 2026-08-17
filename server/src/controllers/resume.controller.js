import mongoose from "mongoose";
import { Resume, Application } from "../models/index.js";

/**
 * GET /api/resumes
 * Lists all resumes in the database, sorted by creation date descending.
 */
export const getAllResumes = async (req, res, next) => {
  try {
    const resumes = await Resume.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: resumes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/resumes/:id
 * Fetches a single resume by its ID.
 */
export const getResumeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resume ID format.",
      });
    }

    const resume = await Resume.findById(id);
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: resume,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/resumes
 * Inserts a new resume metadata document.
 */
export const createResume = async (req, res, next) => {
  try {
    const {
      name,
      filePath,
      skills,
      keywords,
      technologies,
      roles,
      domains,
      experience,
      projects,
      metadata,
      isActive,
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Name is required." });
    }
    if (!filePath || !filePath.trim()) {
      return res.status(400).json({ success: false, message: "filePath is required." });
    }

    const newResume = new Resume({
      name,
      filePath,
      skills,
      keywords,
      technologies,
      roles,
      domains,
      experience,
      projects,
      metadata,
      isActive,
    });

    await newResume.save();

    res.status(201).json({
      success: true,
      message: "Resume created successfully.",
      data: newResume,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/resumes/:id
 * Updates an existing resume document.
 */
export const updateResume = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resume ID format.",
      });
    }

    const resume = await Resume.findById(id);
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found.",
      });
    }

    const {
      name,
      filePath,
      skills,
      keywords,
      technologies,
      roles,
      domains,
      experience,
      projects,
      metadata,
      isActive,
    } = req.body;

    // If provided, validate formatting
    if (name !== undefined && (!name || !name.trim())) {
      return res.status(400).json({ success: false, message: "Name cannot be empty." });
    }
    if (filePath !== undefined && (!filePath || !filePath.trim())) {
      return res.status(400).json({ success: false, message: "filePath cannot be empty." });
    }

    // Set updated values
    if (name !== undefined) resume.name = name;
    if (filePath !== undefined) resume.filePath = filePath;
    if (skills !== undefined) resume.skills = skills;
    if (keywords !== undefined) resume.keywords = keywords;
    if (technologies !== undefined) resume.technologies = technologies;
    if (roles !== undefined) resume.roles = roles;
    if (domains !== undefined) resume.domains = domains;
    if (experience !== undefined) resume.experience = experience;
    if (projects !== undefined) resume.projects = projects;
    if (metadata !== undefined) resume.metadata = metadata;
    if (isActive !== undefined) resume.isActive = isActive;

    await resume.save();

    res.status(200).json({
      success: true,
      message: "Resume updated successfully.",
      data: resume,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/resumes/:id
 * Removes a resume if it is not referenced by any applications.
 */
export const deleteResume = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resume ID format.",
      });
    }

    const resume = await Resume.findById(id);
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found.",
      });
    }

    // Safety Constraint Check: Verify if any Application currently references this resume
    const isReferenced = await Application.findOne({ selectedResume: id });
    if (isReferenced) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete resume because it is currently referenced by one or more job applications.",
      });
    }

    await Resume.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Resume deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
