import { config } from "../config/env.js";

/**
 * Catches requests for nonexistent routes and forwards a 404 status.
 */
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Global exception handler middleware.
 * Returns standard JSON response and prevents stack trace leakage in non-dev environments.
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  console.error(`[Error Handler] ${err.message}`);
  if (config.nodeEnv === "development") {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: config.nodeEnv === "development" ? err.stack : undefined,
  });
};
