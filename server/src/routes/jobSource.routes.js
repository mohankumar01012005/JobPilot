import { Router } from "express";
import { getJobSources } from "../controllers/jobSource.controller.js";

const router = Router();

router.get("/", getJobSources);

export default router;
