import { Router } from "express";
import {
  createJob,
  getAllJobs,
  getJobById,
  runJobMatching,
  getJobMatches,
  getBestResume,
} from "../controllers/job.controller.js";

const router = Router();

router.get("/", getAllJobs);
router.get("/:id", getJobById);
router.post("/", createJob);

// Matching Endpoints
router.post("/:id/match", runJobMatching);
router.get("/:id/matches", getJobMatches);
router.get("/:id/best-resume", getBestResume);

export default router;
