/**
 * Centralized matching weights for calculating the composite JobMatch score.
 * Sum of weights equals 1.0 (100%).
 */
export const MATCH_WEIGHTS = {
  skills: 0.40,      // Required skills/technologies match
  keywords: 0.20,    // General keyword appearance in job descriptions
  roles: 0.15,       // Role/Title alignment
  experience: 0.15,  // Years of experience requirements
  domains: 0.05,     // Domain relevance
  projects: 0.05     // Relevant projects matching job skills
};

/**
 * Parses duration string from resume experience and estimates years of experience.
 * Handles formats like "3 years", "6 months", "Jan 2020 - Dec 2022", "2019 - Present".
 * 
 * @param {string} durationStr Raw duration string from resume
 * @returns {number} Estimated years of experience
 */
const parseExperienceItemYears = (durationStr) => {
  if (!durationStr) return 0;
  
  const trimmed = durationStr.trim();

  // 1. Direct year match, e.g. "3 years", "2.5 yrs"
  const yrsMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(?:year|yr)s?/i);
  if (yrsMatch) {
    return parseFloat(yrsMatch[1]);
  }

  // 2. Direct month match, e.g. "6 months", "18 mos"
  const mosMatch = trimmed.match(/(\d+)\s*(?:month|mo)s?/i);
  if (mosMatch) {
    return parseInt(mosMatch[1], 10) / 12;
  }

  // 3. Date range match, e.g. "Jan 2020 - Dec 2022" or "2019 - Present"
  const rangeMatch = trimmed.match(/([a-zA-Z]+\s+\d{4}|\d{4})\s*-\s*([a-zA-Z]+\s+\d{4}|\d{4}|present|current)/i);
  if (rangeMatch) {
    const startStr = rangeMatch[1];
    const endStr = rangeMatch[2];

    const parseDateStr = (str) => {
      const s = str.trim().toLowerCase();
      if (s === "present" || s === "current") {
        return new Date();
      }
      if (/^\d{4}$/.test(s)) {
        return new Date(parseInt(s, 10), 0, 1);
      }
      const d = new Date(str);
      return isNaN(d.getTime()) ? null : d;
    };

    const startDate = parseDateStr(startStr);
    const endDate = parseDateStr(endStr);

    if (startDate && endDate) {
      const diffMs = endDate.getTime() - startDate.getTime();
      const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
      return Math.max(0.1, diffYears);
    }
  }

  // 4. Fallback simple year range, e.g. "2020-2022"
  const simpleYearsMatch = trimmed.match(/(\d{4})\s*-\s*(\d{4})/);
  if (simpleYearsMatch) {
    const start = parseInt(simpleYearsMatch[1], 10);
    const end = parseInt(simpleYearsMatch[2], 10);
    return Math.max(1, end - start);
  }

  // Safe default for any non-empty duration field
  return 1.0;
};

/**
 * Computes deterministic match details and composite score for a job against a single resume.
 * 
 * @param {Object} job Mongoose Job document
 * @param {Object} resume Mongoose Resume document
 * @returns {Object} Deterministic match details containing matchScore, breakdown, and lists
 */
export const calculateMatch = (job, resume) => {
  if (!job || !resume) {
    throw new Error("Job and Resume are required for match calculation.");
  }

  const jobText = `${job.title || ""} ${job.description || ""}`.toLowerCase();

  // 1. Skills & Technologies Match (Weight: 40%)
  const jobSkills = (job.skillsRequired || []).map((s) => s.toLowerCase());
  const resumeSkills = [
    ...(resume.skills || []),
    ...(resume.technologies || [])
  ].map((s) => s.toLowerCase());

  let skillsScore = 100;
  let matchedSkills = [];
  let missingSkills = [];

  if (jobSkills.length > 0) {
    jobSkills.forEach((jobSkill, idx) => {
      const originalSkillName = job.skillsRequired[idx];
      const isMatched = resumeSkills.some(
        (rs) => rs.includes(jobSkill) || jobSkill.includes(rs)
      );
      if (isMatched) {
        matchedSkills.push(originalSkillName);
      } else {
        missingSkills.push(originalSkillName);
      }
    });
    skillsScore = (matchedSkills.length / jobSkills.length) * 100;
  } else {
    // If job has no skills defined, matchedSkills is empty and score is 100
    matchedSkills = [];
    missingSkills = [];
  }

  // 2. Keywords Match (Weight: 20%)
  const resumeKeywords = (resume.keywords || []).map((k) => k.toLowerCase());
  let keywordsScore = 100;
  let matchedKeywords = [];

  if (resumeKeywords.length > 0) {
    matchedKeywords = resume.keywords.filter((k) =>
      jobText.includes(k.toLowerCase())
    );
    keywordsScore = (matchedKeywords.length / resumeKeywords.length) * 100;
  }

  // 3. Role Alignment Match (Weight: 15%)
  const jobTitle = (job.title || "").toLowerCase();
  const resumeRoles = (resume.roles || []).map((r) => r.toLowerCase());
  let rolesScore = 100;

  if (resumeRoles.length > 0) {
    const directMatch = resumeRoles.some(
      (role) => jobTitle.includes(role) || role.includes(jobTitle)
    );

    if (directMatch) {
      rolesScore = 100;
    } else {
      // Check word intersection, excluding standard title stop words
      const STOP_WORDS = new Set([
        "and", "or", "developer", "engineer", "senior", "junior", "lead", 
        "associate", "intern", "staff", "principal", "ii", "iii", "i", "iv", "v"
      ]);
      const jobWords = new Set(
        jobTitle.split(/\s+/).filter((w) => w && !STOP_WORDS.has(w))
      );
      const resumeWords = new Set(
        resumeRoles
          .flatMap((r) => r.split(/\s+/))
          .filter((w) => w && !STOP_WORDS.has(w))
      );

      let wordIntersection = false;
      for (const w of jobWords) {
        if (resumeWords.has(w)) {
          wordIntersection = true;
          break;
        }
      }
      rolesScore = wordIntersection ? 50 : 0;
    }
  }

  // 4. Experience Relevance Match (Weight: 15%)
  const expReqStr = (job.experienceRequired || "").toLowerCase();
  let requiredYears = 0;

  const yrsMatch = expReqStr.match(/(\d+)\s*(?:-\s*\d+)?\s*(?:year|yr)s?/i);
  if (yrsMatch) {
    requiredYears = parseInt(yrsMatch[1], 10);
  } else if (expReqStr.includes("senior") || expReqStr.includes("lead") || expReqStr.includes("principal") || expReqStr.includes("staff")) {
    requiredYears = 5;
  } else if (expReqStr.includes("junior") || expReqStr.includes("entry") || expReqStr.includes("associate") || expReqStr.includes("intern")) {
    requiredYears = 1;
  }

  const actualYears = (resume.experience || []).reduce(
    (sum, expItem) => sum + parseExperienceItemYears(expItem.duration),
    0
  );

  let experienceScore = 100;
  if (requiredYears > 0) {
    experienceScore = Math.min(100, (actualYears / requiredYears) * 100);
  }
  const matchedExperience = actualYears >= requiredYears;

  // 5. Domain Relevance Match (Weight: 5%)
  const resumeDomains = (resume.domains || []).map((d) => d.toLowerCase());
  let domainsScore = 100;

  if (resumeDomains.length > 0) {
    const matchedDomains = resumeDomains.filter((d) => jobText.includes(d));
    domainsScore = (matchedDomains.length / resumeDomains.length) * 100;
  }

  // 6. Project Relevance Match (Weight: 5%)
  const resumeProjects = resume.projects || [];
  let projectsScore = 100;

  if (resumeProjects.length > 0 && jobSkills.length > 0) {
    const matchingProjCount = resumeProjects.filter((project) => {
      const projText = [
        project.title || "",
        project.description || "",
        ...(project.technologies || [])
      ].join(" ").toLowerCase();

      return jobSkills.some((skill) => projText.includes(skill));
    }).length;

    projectsScore = (matchingProjCount / resumeProjects.length) * 100;
  }

  // Calculate composite weighted overall score (0 - 100)
  const rawScore =
    skillsScore * MATCH_WEIGHTS.skills +
    keywordsScore * MATCH_WEIGHTS.keywords +
    rolesScore * MATCH_WEIGHTS.roles +
    experienceScore * MATCH_WEIGHTS.experience +
    domainsScore * MATCH_WEIGHTS.domains +
    projectsScore * MATCH_WEIGHTS.projects;

  const matchScore = Math.round(rawScore);

  return {
    matchScore,
    breakdown: {
      matchedSkills,
      missingSkills,
      matchedExperience,
      matchedKeywords
    }
  };
};
