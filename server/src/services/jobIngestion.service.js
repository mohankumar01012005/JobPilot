import crypto from "crypto";

/**
 * Normalizes raw job payload fields into the standard structure of the Job model.
 * Generates a deterministic deduplication hash (`dedupHash`) based on the core
 * identifying details: title, company, location, and description.
 * 
 * @param {Object} payload Raw job details from an external payload or API request
 * @returns {Object} Normalized job object ready for validation/insertion
 */
export const normalizeJob = (payload) => {
  if (!payload) {
    throw new Error("Payload is required for normalization.");
  }

  // 1. title (required)
  const title = typeof payload.title === "string" ? payload.title.trim() : "";

  // 2. company (required)
  const company = typeof payload.company === "string" ? payload.company.trim() : "";

  // 3. description (required)
  const description = typeof payload.description === "string" ? payload.description.trim() : "";

  // 4. location
  let location = typeof payload.location === "string" ? payload.location.trim() : "";
  if (!location) {
    location = "Remote";
  }

  // 5. URL (sparse unique constraint check: fallback to undefined so sparse index doesn't conflict)
  let url = typeof payload.url === "string" ? payload.url.trim() : undefined;
  if (!url) {
    url = undefined;
  }

  // 6. source (required)
  const source = typeof payload.source === "string" ? payload.source.trim() : "";

  // 7. postedAt
  let postedAt;
  if (payload.postedAt) {
    const parsedDate = new Date(payload.postedAt);
    postedAt = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  } else {
    postedAt = new Date();
  }

  // 8. employmentType
  const employmentType = typeof payload.employmentType === "string" ? payload.employmentType.trim() : "";

  // 9. experience -> maps to experienceRequired
  let experienceRequired = "";
  if (payload.experience !== undefined && payload.experience !== null) {
    if (typeof payload.experience === "string") {
      experienceRequired = payload.experience.trim();
    } else {
      experienceRequired = String(payload.experience);
    }
  }

  // 10. skills -> maps to skillsRequired
  let skillsRequired = [];
  if (Array.isArray(payload.skills)) {
    skillsRequired = payload.skills
      .map((s) => (typeof s === "string" ? s.trim() : String(s).trim()))
      .filter((s) => s.length > 0);
  } else if (typeof payload.skills === "string") {
    skillsRequired = payload.skills
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  // 11. referralAvailable
  const referralAvailable = payload.referralAvailable === true || payload.referralAvailable === "true";

  // 12. telegramMessageId
  const telegramMessageId = payload.telegramMessageId ? String(payload.telegramMessageId).trim() : undefined;

  // Optional: referralDetails mapping if present
  const referralDetails = {};
  if (payload.referralDetails) {
    if (payload.referralDetails.postId) referralDetails.postId = String(payload.referralDetails.postId).trim();
    if (payload.referralDetails.channelName) referralDetails.channelName = String(payload.referralDetails.channelName).trim();
    if (payload.referralDetails.contactUser) referralDetails.contactUser = String(payload.referralDetails.contactUser).trim();
  }

  // Model-specific fields: normalizedTitle and normalizedCompany
  const normalizedTitle = title.toLowerCase();
  const normalizedCompany = company.toLowerCase();

  // Generate deterministic dedupHash
  // Normalize string pieces by lowercasing and stripping non-alphanumeric chars
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanCompany = company.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanLocation = location.toLowerCase().replace(/[^a-z0-9]/g, "");
  
  // Clean description by removing HTML tags and stripping non-alphanumeric chars
  const cleanDescription = description
    .toLowerCase()
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/[^a-z0-9]/g, "");

  const combinedString = `${cleanTitle}|${cleanCompany}|${cleanLocation}|${cleanDescription}`;
  const dedupHash = crypto.createHash("sha256").update(combinedString).digest("hex");

  return {
    title,
    company,
    description,
    location,
    url,
    source,
    postedAt,
    employmentType,
    experienceRequired,
    skillsRequired,
    referralAvailable,
    referralDetails,
    telegramMessageId,
    normalizedTitle,
    normalizedCompany,
    dedupHash,
  };
};
