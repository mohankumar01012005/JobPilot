import { Router } from "express";
import {
  getAllResumes,
  getResumeById,
  createResume,
  updateResume,
  deleteResume,
} from "../controllers/resume.controller.js";

const router = Router();

router.get("/", getAllResumes);
router.get("/:id", getResumeById);
router.post("/", createResume);
router.put("/:id", updateResume);
router.delete("/:id", deleteResume);

export default router;
