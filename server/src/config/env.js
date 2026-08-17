import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongodbUri: process.env.MONGODB_URI || "",
};

/**
 * Validates the core configuration.
 * Returns true if all required configurations are present, false otherwise.
 */
export const validateConfig = () => {
  const missing = [];
  if (!config.mongodbUri) {
    missing.push("MONGODB_URI");
  }
  return {
    isValid: missing.length === 0,
    missing,
  };
};
