import mongoose from "mongoose";
import { config } from "./env.js";

// Flag to prevent overlapping connection attempts during startup
let isConnecting = false;

// Register Mongoose connection event listeners for logging
mongoose.connection.on("connected", () => {
  console.log("Mongoose connection successfully established.");
});

mongoose.connection.on("error", (err) => {
  console.error(`Mongoose connection error: ${err.message}`);
});

mongoose.connection.on("disconnected", () => {
  console.log("Mongoose connection disconnected.");
});

/**
 * Connect to MongoDB using the configured MONGODB_URI.
 * If the connection URI is not provided, it will log a warning and return null.
 */
export const connectDB = async () => {
  if (!config.mongodbUri) {
    console.warn("WARNING: MONGODB_URI is not set. MongoDB connection will be skipped.");
    return null;
  }

  // If already connected, return the connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (isConnecting) {
    console.log("MongoDB connection attempt already in progress...");
    return null;
  }

  isConnecting = true;

  try {
    console.log("Initializing MongoDB connection...");
    const conn = await mongoose.connect(config.mongodbUri);
    return conn.connection;
  } catch (error) {
    console.error(`Failed to connect to MongoDB: ${error.message}`);
    throw error;
  } finally {
    isConnecting = false;
  }
};

/**
 * Returns a user-friendly string representing the database connection status.
 * This is safe to expose via health endpoints without leaking sensitive info.
 */
export const getDBStatus = () => {
  if (!config.mongodbUri) {
    return "disconnected (missing configuration)";
  }

  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return states[mongoose.connection.readyState] || "unknown";
};
