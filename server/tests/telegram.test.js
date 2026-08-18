import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { parseTelegramMessage } from "../src/services/telegramParser.js";
import { normalizeJob } from "../src/services/jobIngestion.service.js";
import registry from "../src/services/adapters/registry.js";
import { Job } from "../src/models/index.js";
import { ingestTelegramJobs } from "../src/controllers/telegramIngest.controller.js";

// Load environment variables for DB connection
dotenv.config();

// Helper to connect/disconnect DB
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set in environment");
  }
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};

test.describe("Telegram Referral Job Ingestion Tests", () => {
  test.before(async () => {
    await connectDB();
    // Sync indexes to ensure sparse unique constraints are active
    await Job.syncIndexes();
    // Clean up any stray test data before starting
    await Job.deleteMany({ "referralDetails.channelName": "mock_telegram_channel" });
  });

  test.after(async () => {
    // Clean up created test data
    await Job.deleteMany({ "referralDetails.channelName": "mock_telegram_channel" });
    await disconnectDB();
  });

  test.describe("1. Telegram Parser Tests", () => {
    test("should parse a valid job post correctly with explicit title/company extraction", () => {
      const text = `Title: Backend Developer
Company: Test Stripe Corp
Description: We are looking for a Node.js engineer to build scalable payment APIs.
Location: Remote
URL: https://stripe.com/jobs/test-2001
Skills: Node.js, MongoDB, Javascript
Experience: 3 years`;

      const parsed = parseTelegramMessage(text, "2001", "mock_telegram_channel", 1620000000);

      assert.ok(parsed, "Parser returned null for valid job post");
      assert.strictEqual(parsed.title, "Backend Developer");
      assert.strictEqual(parsed.company, "Test Stripe Corp");
      assert.strictEqual(parsed.location, "Remote");
      assert.strictEqual(parsed.url, "https://stripe.com/jobs/test-2001");
      assert.strictEqual(parsed.source, "telegram");
      assert.deepStrictEqual(parsed.skills, ["Node.js", "MongoDB", "Javascript"]);
      assert.strictEqual(parsed.experience, "3 years");
      assert.strictEqual(parsed.telegramMessageId, "telegram_mock_telegram_channel_2001");
      assert.strictEqual(parsed.referralDetails.postId, "2001");
      assert.strictEqual(parsed.referralDetails.channelName, "mock_telegram_channel");
    });

    test("should parse a valid referral post correctly with clean skills, contact, and title extraction", () => {
      const text = "Hiring referral opportunity for Senior React Developer role at Netflix! Remote available. Needs Skills: React, TailwindCSS. Referral is available, contact @netflixreferral for details.";
      const parsed = parseTelegramMessage(text, "2002", "mock_telegram_channel", 1620000000);

      assert.ok(parsed, "Parser returned null for valid referral post");
      assert.strictEqual(parsed.title, "Senior React Developer");
      assert.strictEqual(parsed.company, "Netflix");
      assert.strictEqual(parsed.referralAvailable, true);
      assert.strictEqual(parsed.referralDetails.contactUser, "netflixreferral");
      assert.deepStrictEqual(parsed.skills, ["React", "TailwindCSS"]); // Clean skills extraction
      assert.strictEqual(parsed.telegramMessageId, "telegram_mock_telegram_channel_2002");
    });

    test("should ignore an irrelevant message by returning null", () => {
      const text = "Hello everyone, don't forget that we have a team meeting scheduled this afternoon at 3 PM.";
      const parsed = parseTelegramMessage(text, "2003", "mock_telegram_channel", 1620000000);
      assert.strictEqual(parsed, null, "Parser should return null for irrelevant messages");
    });

    test("should parse an incomplete job post safely with fallback title and company", () => {
      const text = "New job alert! We are hiring developers at dynamic startup. Apply here: http://startup.com/apply. Contact @startupceo.";
      const parsed = parseTelegramMessage(text, "2004", "mock_telegram_channel", 1620000000);

      assert.ok(parsed, "Parser returned null for incomplete job post");
      assert.strictEqual(parsed.title, "developers"); // rolePattern match
      assert.strictEqual(parsed.company, "Unknown Company");
      assert.strictEqual(parsed.url, "http://startup.com/apply");
      assert.strictEqual(parsed.referralAvailable, true);
      assert.strictEqual(parsed.referralDetails.contactUser, "startupceo");
    });

    test("should test referral detection variations", () => {
      const text1 = "Ping @hiringmanager to refer for this job.";
      const parsed1 = parseTelegramMessage(text1, "2005", "mock_telegram_channel", 1620000000);
      assert.ok(parsed1);
      assert.strictEqual(parsed1.referralAvailable, true);
      assert.strictEqual(parsed1.referralDetails.contactUser, "hiringmanager");

      const text2 = "DM @recruiter to apply.";
      const parsed2 = parseTelegramMessage(text2, "2006", "mock_telegram_channel", 1620000000);
      assert.ok(parsed2);
      assert.strictEqual(parsed2.referralAvailable, true);
      assert.strictEqual(parsed2.referralDetails.contactUser, "recruiter");

      const text3 = "Message @teammember for employee referral details.";
      const parsed3 = parseTelegramMessage(text3, "2007", "mock_telegram_channel", 1620000000);
      assert.ok(parsed3);
      assert.strictEqual(parsed3.referralAvailable, true);
      assert.strictEqual(parsed3.referralDetails.contactUser, "teammember");
    });

    test("should clean up skills and exclude URLs / contact info / sentence text", () => {
      const text = `Title: Vue Developer
Company: GitLab
Description: We are hiring a Senior Vue Developer.
Skills: Vue, CSS, https://gitlab.com/apply, contact @gitlabhr, Referral is available.`;

      const parsed = parseTelegramMessage(text, "2008", "mock_telegram_channel", 1620000000);
      assert.ok(parsed);
      assert.deepStrictEqual(parsed.skills, ["Vue", "CSS"]); // Excludes URL, contact, and sentence
    });

    test("should handle generic job-alert message falls backs correctly", () => {
      const text = `New job alert!
Hiring alert!
We need a Senior Backend Architect to lead our database migration.`;
      
      const parsed = parseTelegramMessage(text, "2009", "mock_telegram_channel", 1620000000);
      assert.ok(parsed);
      assert.strictEqual(parsed.title, "We need a Senior Backend Architect to lead our dat...");
    });
  });

  test.describe("2. Pipeline Integration Tests (Parser -> Adapter -> Ingestion)", () => {
    test("should transform, normalize, and save a valid Telegram job", async () => {
      const text = `Title: Backend Developer
Company: Test Stripe Corp
Description: We are looking for a Node.js engineer to build scalable payment APIs.
Location: Remote
URL: https://stripe.com/jobs/test-2001
Skills: Node.js, MongoDB, Javascript
Experience: 3 years`;

      const adapter = registry.getAdapter("telegram");
      const transformed = adapter.transform({
        text,
        messageId: "2001",
        chatId: "mock_telegram_channel",
        date: 1620000000,
      });

      const normalized = normalizeJob(transformed);
      assert.strictEqual(normalized.telegramMessageId, "telegram_mock_telegram_channel_2001");
      assert.strictEqual(normalized.dedupHash.length, 64); // SHA-256 hex length

      const job = new Job(normalized);
      await job.save();

      const savedJob = await Job.findOne({ telegramMessageId: "telegram_mock_telegram_channel_2001" });
      assert.ok(savedJob);
      assert.strictEqual(savedJob.title, "Backend Developer");
      assert.strictEqual(savedJob.company, "Test Stripe Corp");
    });

    test("should prevent saving duplicate messages based on telegramMessageId", async () => {
      const duplicateJobData = {
        title: "Backend Developer",
        company: "Test Stripe Corp",
        description: "We are looking for a Node.js engineer to build scalable payment APIs.",
        source: "telegram",
        telegramMessageId: "telegram_mock_telegram_channel_2001",
      };

      const job = new Job(duplicateJobData);
      await assert.rejects(
        job.save(),
        /duplicate key/i,
        "Saving duplicate telegramMessageId should throw unique constraint violation error"
      );
    });

    test("should prevent saving duplicate jobs based on content dedupHash", async () => {
      // Create a job with same contents but different message ID
      const text = `Title: Backend Developer
Company: Test Stripe Corp
Description: We are looking for a Node.js engineer to build scalable payment APIs.
Location: Remote
URL: https://stripe.com/jobs/test-2001
Skills: Node.js, MongoDB, Javascript
Experience: 3 years`;

      const adapter = registry.getAdapter("telegram");
      const transformed = adapter.transform({
        text,
        messageId: "2001-dup",
        chatId: "mock_telegram_channel",
        date: 1620000000,
      });

      const normalized = normalizeJob(transformed);
      const job = new Job(normalized);

      await assert.rejects(
        job.save(),
        /duplicate key/i,
        "Saving job with duplicate dedupHash should throw unique constraint violation error"
      );
    });
  });

  test.describe("3. Controller Ingestion API Tests (Mock Mode)", () => {
    test("should successfully ingest jobs in Mock Mode and return correct statistics", async () => {
      // Clear data to start fresh for the controller test
      await Job.deleteMany({ "referralDetails.channelName": "mock_telegram_channel" });

      // Mock Express Request and Response
      const req = {};
      const res = {
        statusCode: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          this.body = payload;
          return this;
        },
      };

      const next = (err) => {
        throw err;
      };

      // Force credentials to be unset to trigger Mock Mode
      const originalBotToken = process.env.TELEGRAM_BOT_TOKEN;
      const originalChatId = process.env.TELEGRAM_CHAT_ID;
      delete process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.TELEGRAM_CHAT_ID;

      try {
        await ingestTelegramJobs(req, res, next);

        assert.strictEqual(res.statusCode, 200);
        assert.ok(res.body.success);
        assert.strictEqual(res.body.data.mode, "mock");
        
        // Expected stats:
        // Case 1 (2001): Valid -> Created
        // Case 2 (2002): Valid -> Created
        // Case 3 (2003): Irrelevant -> Ignored
        // Case 4 (2004): Incomplete (Missing title/company heuristics fallback, but description valid, so normalizes)
        // Parser falls back to: Title: "New job alert! We are hiring developers...", Company: "Unknown Company". So it has valid title, company, description. It normalizes and saves -> Created.
        // Case 5 (2001 duplicate messageId): Duplicate msg -> Duplicate
        assert.strictEqual(res.body.data.examined, 5);
        assert.strictEqual(res.body.data.created, 3); // 2001, 2002, 2004
        assert.strictEqual(res.body.data.ignored, 1); // 2003
        assert.strictEqual(res.body.data.duplicates, 1); // 2001 duplicate msgId
      } finally {
        // Restore original env vars
        if (originalBotToken) process.env.TELEGRAM_BOT_TOKEN = originalBotToken;
        if (originalChatId) process.env.TELEGRAM_CHAT_ID = originalChatId;
      }
    });

    test("should prevent repeated ingestion of same messages on consecutive runs", async () => {
      // Repeat the ingest call with no DB clearing in between
      const req = {};
      const res = {
        statusCode: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          this.body = payload;
          return this;
        },
      };

      const next = (err) => {
        throw err;
      };

      const originalBotToken = process.env.TELEGRAM_BOT_TOKEN;
      const originalChatId = process.env.TELEGRAM_CHAT_ID;
      delete process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.TELEGRAM_CHAT_ID;

      try {
        await ingestTelegramJobs(req, res, next);

        assert.strictEqual(res.statusCode, 200);
        assert.ok(res.body.success);
        assert.strictEqual(res.body.data.mode, "mock");
        
        // On consecutive runs, all 2001, 2002, 2004 are already in the DB.
        // So we expect:
        // Examined: 5
        // Created: 0
        // Duplicates: 4 (2001, 2002, 2004, and the 2001 duplicate message)
        // Ignored: 1 (2003)
        assert.strictEqual(res.body.data.examined, 5);
        assert.strictEqual(res.body.data.created, 0);
        assert.strictEqual(res.body.data.ignored, 1);
        assert.strictEqual(res.body.data.duplicates, 4);
      } finally {
        if (originalBotToken) process.env.TELEGRAM_BOT_TOKEN = originalBotToken;
        if (originalChatId) process.env.TELEGRAM_CHAT_ID = originalChatId;
      }
    });
  });
});
