import { Router } from "express";
import {
  getProfile,
  createProfile,
  updateProfile,
} from "../controllers/profile.controller.js";

const router = Router();

router.get("/", getProfile);
router.post("/", createProfile);
router.put("/", updateProfile);

export default router;
