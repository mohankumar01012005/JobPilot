import { Router } from "express";
import { ingestTelegramJobs } from "../controllers/telegramIngest.controller.js";

const router = Router();

router.post("/telegram/ingest", ingestTelegramJobs);

export default router;
