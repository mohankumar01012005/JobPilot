import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import { config, validateConfig } from "./config/env.js";
import { connectDB } from "./config/db.js";
import healthRouter from "./routes/health.routes.js";
import profileRouter from "./routes/profile.routes.js";
import resumeRouter from "./routes/resume.routes.js";
import jobRouter from "./routes/job.routes.js";
import jobSourceRouter from "./routes/jobSource.routes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import "./models/index.js";

const app = express();
const PORT = config.port;

// Global Middleware Setup
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// API Routes
app.use("/api", healthRouter);
app.use("/api/profile", profileRouter);
app.use("/api/resumes", resumeRouter);
app.use("/api/jobs", jobRouter);
app.use("/api/job-sources", jobSourceRouter);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Bootstrapping function
const startServer = async () => {
  try {
    // Validate required configuration variables
    const check = validateConfig();
    if (!check.isValid) {
      console.warn(`WARNING: Startup configuration check failed. Missing variables: ${check.missing.join(", ")}`);
    }

    // Connect to Database if URI is present
    if (config.mongodbUri) {
      try {
        await connectDB();
      } catch (dbError) {
        console.error(`Warning: Database startup connection failed, but proceeding to start HTTP server: ${dbError.message}`);
      }
    } else {
      console.warn("WARNING: MongoDB URI not provided. Skipping connection attempt.");
    }

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`JobPilot server running in ${config.nodeEnv} mode on http://localhost:${PORT}`);
    });

    // Graceful Shutdown Manager
    const gracefulShutdown = async (signal) => {
      console.log(`Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        console.log("HTTP server closed.");
        try {
          if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
            console.log("MongoDB connection closed.");
          }
        } catch (dbCloseError) {
          console.error("Error closing MongoDB connection:", dbCloseError);
        }
        console.log("Graceful shutdown complete.");
        process.exit(0);
      });
    };

    // Listen to termination signals
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  } catch (error) {
    console.error(`Fatal server start error: ${error.message}`);
    process.exit(1);
  }
};

startServer();