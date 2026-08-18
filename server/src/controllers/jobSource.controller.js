import registry from "../services/adapters/registry.js";

/**
 * GET /api/job-sources
 * Lists all registered job sources, display names, implementation status and automated fetching support.
 */
export const getJobSources = async (req, res, next) => {
  try {
    const sources = registry.listSources();
    return res.status(200).json({
      success: true,
      data: sources,
    });
  } catch (error) {
    next(error);
  }
};
