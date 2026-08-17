import { getDBStatus } from "../config/db.js";
import { config } from "../config/env.js";

/**
 * Controller to handle API health check request.
 * Exposes uptime, environment name, current timestamp, and database connection state
 * without revealing sensitive keys or URI details.
 */
export const getHealth = (req, res) => {
  res.status(200).json({
    success: true,
    message: "JobPilot server is running",
    timestamp: new Date().toISOString(),
    env: config.nodeEnv,
    uptime: process.uptime(),
    database: {
      status: getDBStatus(),
    },
  });
};
