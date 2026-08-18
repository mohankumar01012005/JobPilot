import { Job } from "../models/index.js";
import registry from "../services/adapters/registry.js";
import { normalizeJob } from "../services/jobIngestion.service.js";

/**
 * POST /api/job-sources/telegram/ingest
 * Manual trigger endpoint to fetch Telegram messages (or mock messages),
 * parse them, and run them through the ingestion service.
 */

export const ingestTelegramJobs = async (req, res, next) => {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const isLive = !!(token && chatId);

    const telegramAdapter = registry.getAdapter("telegram");
    if (!telegramAdapter) {
      return res.status(500).json({
        success: false,
        message: "Telegram adapter is not registered in the system.",
      });
    }

    let messages = [];
    if (isLive) {
      console.log(`[Telegram Ingest] Running in Live Integration Mode. Channel: ${chatId}`);
      messages = await telegramAdapter.fetchJobs();
    } else {
      console.log("[Telegram Ingest] Environment credentials not set. Running in Mock Mode.");
      // 5 Mock Telegram Messages representing the validation test cases
      messages = [
        {
          // Case 1: Valid Job Post
          messageId: "2001",
          chatId: "mock_telegram_channel",
          text: "Title: Backend Developer\nCompany: Test Stripe Corp\nDescription: We are looking for a Node.js engineer to build scalable payment APIs.\nLocation: Remote\nURL: https://stripe.com/jobs/test-2001\nSkills: Node.js, MongoDB, Javascript\nExperience: 3 years",
          date: Math.floor(Date.now() / 1000),
        },
        {
          // Case 2: Valid Referral Post
          messageId: "2002",
          chatId: "mock_telegram_channel",
          text: "Hiring referral opportunity for Senior React Developer role at Netflix! Remote available. Needs Skills: React, TailwindCSS. Referral is available, contact @netflixreferral for details.",
          date: Math.floor(Date.now() / 1000),
        },
        {
          // Case 3: Irrelevant Message
          messageId: "2003",
          chatId: "mock_telegram_channel",
          text: "Hello everyone, don't forget that we have a team meeting scheduled this afternoon at 3 PM.",
          date: Math.floor(Date.now() / 1000),
        },
        {
          // Case 4: Incomplete Job Post (processed safely)
          messageId: "2004",
          chatId: "mock_telegram_channel",
          text: "New job alert! We are hiring developers at dynamic startup. Apply here: http://startup.com/apply. Contact @startupceo.",
          date: Math.floor(Date.now() / 1000),
        },
        {
          // Case 5: Duplicate Message (same messageId as Case 1)
          messageId: "2001",
          chatId: "mock_telegram_channel",
          text: "Title: Backend Developer\nCompany: Test Stripe Corp\nDescription: We are looking for a Node.js engineer to build scalable payment APIs.\nLocation: Remote\nURL: https://stripe.com/jobs/test-2001\nSkills: Node.js, MongoDB, Javascript\nExperience: 3 years",
          date: Math.floor(Date.now() / 1000),
        }
      ];
    }

    let examined = 0;
    let created = 0;
    let duplicates = 0;
    let ignored = 0;
    const errors = [];

    for (const msg of messages) {
      examined++;

      try {
        // Step 1: Prevent repeatedly processing the same Telegram message (message ID uniqueness)
        const telegramMessageId = `telegram_${msg.chatId}_${msg.messageId}`;
        const alreadyProcessed = await Job.findOne({ telegramMessageId });

        if (alreadyProcessed) {
          duplicates++;
          continue;
        }

        // Step 2: Parse and transform raw payload using the Telegram source adapter
        let transformed;
        try {
          transformed = telegramAdapter.transform({
            source: "telegram",
            text: msg.text,
            messageId: msg.messageId,
            chatId: msg.chatId,
            date: msg.date,
          });
        } catch (transformError) {
          // If transform fails because it's not a job post, mark it ignored
          ignored++;
          continue;
        }

        // Step 3: Run generic normalization to obtain central dedupHash and standard formatting
        const normalized = normalizeJob(transformed);

        // Validate transformed job standard required fields
        const { title, company, description } = normalized;
        if (!title || !company || !description) {
          ignored++;
          continue;
        }

        // Check Job-level deduplication (dedupHash / url uniqueness) using normalized fields
        const queryConditions = [{ dedupHash: normalized.dedupHash }];
        if (normalized.url) {
          queryConditions.push({ url: normalized.url });
        }

        const existingJob = await Job.findOne({ $or: queryConditions });

        if (existingJob) {
          duplicates++;
          // Still save message reference on the existing job so we don't check this message again
          existingJob.referralDetails = normalized.referralDetails;
          existingJob.telegramMessageId = normalized.telegramMessageId;
          await existingJob.save();
          continue;
        }

        // Save new job record
        const newJob = new Job(normalized);
        await newJob.save();
        created++;
      } catch (err) {
        console.error(`[Telegram Ingest] Error processing message ${msg.messageId}:`, err.message);
        errors.push({
          messageId: String(msg.messageId),
          error: err.message,
        });
      }
    }

    // Confirm updates if in live mode
    if (isLive && messages.length > 0) {
      const updateIds = messages.map((m) => m.updateId).filter((id) => id !== undefined && id !== null);
      if (updateIds.length > 0) {
        const maxUpdateId = Math.max(...updateIds);
        await telegramAdapter.confirmUpdates(maxUpdateId);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        mode: isLive ? "live" : "mock",
        examined,
        created,
        duplicates,
        ignored,
        errors,
      },
    });
  } catch (error) {
    next(error);
  }
};
