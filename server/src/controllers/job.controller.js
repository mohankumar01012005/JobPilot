import mongoose from "mongoose";
import { Job, Resume, JobMatch } from "../models/index.js";
import { normalizeJob } from "../services/jobIngestion.service.js";
import { calculateMatch } from "../services/matching.service.js";

/**
 * POST /api/jobs
 * Ingests a raw job, validates, normalizes, detects duplicates, and stores.
 */
export const createJob = async (req, res, next) => {
  try {
    const { title, company, description, source } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!title || !title.trim()) missingFields.push("title");
    if (!company || !company.trim()) missingFields.push("company");
    if (!description || !description.trim()) missingFields.push("description");
    if (!source || !source.trim()) missingFields.push("source");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Normalize incoming payload
    const normalized = normalizeJob(req.body);

    // Duplicate detection check
    // Check both unique sparse url and dedupHash to avoid Mongoose duplicate key errors
    const queryConditions = [{ dedupHash: normalized.dedupHash }];
    if (normalized.url) {
      queryConditions.push({ url: normalized.url });
    }

    const existingJob = await Job.findOne({ $or: queryConditions });

    if (existingJob) {
      return res.status(200).json({
        success: true,
        message: "Job already exists.",
        data: existingJob,
        ingested: false,
      });
    }

    // Create and save new job record
    const newJob = new Job(normalized);
    await newJob.save();

    return res.status(201).json({
      success: true,
      message: "Job ingested successfully.",
      data: newJob,
      ingested: true,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/jobs
 * Lists jobs with pagination and basic filters (source, location, title).
 */
export const getAllJobs = async (req, res, next) => {
  try {
    const { source, location, title, page, limit } = req.query;

    // Build filter query
    const filter = {};
    if (source && source.trim()) {
      filter.source = { $regex: source.trim(), $options: "i" };
    }
    if (location && location.trim()) {
      filter.location = { $regex: location.trim(), $options: "i" };
    }
    if (title && title.trim()) {
      filter.title = { $regex: title.trim(), $options: "i" };
    }

    // Pagination variables
    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);

    const pageNum = isNaN(pageInt) || pageInt <= 0 ? 1 : pageInt;
    const limitNum = isNaN(limitInt) || limitInt <= 0 ? 10 : limitInt;
    const skip = (pageNum - 1) * limitNum;

    // Query DB
    const total = await Job.countDocuments(filter);
    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      data: jobs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/jobs/:id
 * Fetches a single job by ID.
 */
export const getJobById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID format.",
      });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/jobs/:id/match
 * Compares the job with all available resumes, saving/updating JobMatch records.
 * Marks the highest-scoring match as the selected resume.
 */
export const runJobMatching = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID format.",
      });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    // Retrieve all resumes in the database
    const resumes = await Resume.find();
    if (!resumes || resumes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No resumes found in the library. Please upload a resume first.",
      });
    }

    const matchRecords = [];

    // Calculate match details for each resume
    for (const resume of resumes) {
      const { matchScore, breakdown } = calculateMatch(job, resume);

      const matchData = {
        job: job._id,
        resume: resume._id,
        matchScore,
        breakdown,
        isSelectedResume: false,
      };

      // Upsert: prevents duplicates by querying matching job and resume references
      const updatedMatch = await JobMatch.findOneAndUpdate(
        { job: job._id, resume: resume._id },
        matchData,
        { new: true, upsert: true }
      );
      matchRecords.push(updatedMatch);
    }

    // Identify the best match (highest matchScore, with deterministic tie-breaker)
    const sortedMatches = [...matchRecords].sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return String(b.resume).localeCompare(String(a.resume)); // deterministic tie-breaker
    });

    const bestMatchId = sortedMatches[0]._id;

    // Reset isSelectedResume to false for all other match records of this job
    await JobMatch.updateMany(
      { job: job._id, _id: { $ne: bestMatchId } },
      { $set: { isSelectedResume: false } }
    );

    // Set isSelectedResume to true on the best match record
    await JobMatch.findByIdAndUpdate(
      bestMatchId,
      { $set: { isSelectedResume: true } },
      { new: true }
    );

    // Fetch updated matches populated with resume details
    const allMatches = await JobMatch.find({ job: job._id })
      .populate("resume")
      .sort({ matchScore: -1 });

    return res.status(200).json({
      success: true,
      message: "Job-to-Resume matching completed successfully.",
      data: allMatches,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/jobs/:id/matches
 * Returns all resume matches for the job, ordered by score descending.
 */
export const getJobMatches = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID format.",
      });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    const matches = await JobMatch.find({ job: id })
      .populate("resume")
      .sort({ matchScore: -1 });

    return res.status(200).json({
      success: true,
      data: matches,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/jobs/:id/best-resume
 * Returns the best matching resume and its match details.
 */
export const getBestResume = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID format.",
      });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    const bestMatch = await JobMatch.findOne({ job: id, isSelectedResume: true })
      .populate("resume");

    if (!bestMatch) {
      const matchCount = await JobMatch.countDocuments({ job: id });
      if (matchCount === 0) {
        return res.status(404).json({
          success: false,
          message: "No resume matches calculated for this job yet. Please run match endpoint first.",
        });
      }
      return res.status(404).json({
        success: false,
        message: "Best resume match not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: bestMatch,
    });
  } catch (error) {
    next(error);
  }
};
