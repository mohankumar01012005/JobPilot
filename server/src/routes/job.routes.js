import { Router } from "express";
import {
  createJob,
  getAllJobs,
  getJobById,
} from "../controllers/job.controller.js";

const router = Router();

router.get("/", getAllJobs);
router.get("/:id", getJobById);
router.post("/", createJob);

export default router;
