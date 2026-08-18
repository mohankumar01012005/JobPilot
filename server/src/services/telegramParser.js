/**
 * Parses raw text from a Telegram message, checking for job post keywords,
 * and extracting job title, company, description, location, application URL,
 * experience requirements, skills, and referral information.
 * 
 * @param {string} text Plain text content of the Telegram message
 * @param {number|string} messageId Unique message ID from Telegram
 * @param {number|string} chatId Unique chat/channel ID or name
 * @param {number} [date] Timestamp in seconds when the message was sent
 * @returns {Object|null} Structured job payload, or null if message is not a job post
 */
export const parseTelegramMessage = (text, messageId, chatId, date) => {
  if (!text || typeof text !== "string") {
    return null;
  }

  const textLower = text.toLowerCase();

  // 1. Core Job Keyword Check
  const jobKeywords = [
    "hiring", "job", "vacancy", "role", "looking for", "recruiting",
    "apply", "referral", "position", "developer", "engineer",
    "designer", "manager", "opening", "contractor"
  ];
  const isJobPost = jobKeywords.some((keyword) => textLower.includes(keyword));
  if (!isJobPost) {
    return null; // Ignore irrelevant messages
  }

  // 2. Parse Title
  let title = "";
  const titleMatch = text.match(/(?:Title|Role|Position|Job Title|JobRole)\s*:\s*(.*)/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
  } else {
    // Look for role patterns like "hiring for [Role]" or "looking for [Role]"
    const rolePattern = /(?:hiring referral opportunity for|hiring for|looking for a|looking for|hiring|role as)\s+([A-Za-z0-9\s\/\.#+-]{0,50}?(?:\b(?:Developer|Engineer|Designer|Manager|Writer|Analyst|Consultant|Architect|Lead|Specialist)s?\b))/i;
    const roleMatch = text.match(rolePattern);
    
    if (roleMatch) {
      title = roleMatch[1].trim();
    } else {
      // Fallback: find the first non-generic line and use it
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      let fallbackTitle = "";
      let firstNonGenericLine = "";
      
      for (const line of lines) {
        const lineLower = line.toLowerCase();
        const isGeneric = lineLower.startsWith("new job alert") || 
                          lineLower.startsWith("hiring alert") || 
                          lineLower.startsWith("job opportunity") ||
                          lineLower.startsWith("job alert");
        if (isGeneric) {
          continue;
        }
        
        if (!firstNonGenericLine) {
          firstNonGenericLine = line;
        }
        
        if (line.length < 60) {
          fallbackTitle = line;
          break;
        }
      }
      
      if (fallbackTitle) {
        title = fallbackTitle;
      } else if (firstNonGenericLine) {
        title = firstNonGenericLine.substring(0, 50).trim() + "...";
      } else {
        title = text.substring(0, 50).trim() + "...";
      }
    }
  }

  // 3. Parse Company
  let company = "";
  const companyMatch = text.match(/(?:Company|Hiring at|Organization|Employer|Firm)\s*:\s*(.*)/i);
  if (companyMatch) {
    company = companyMatch[1].trim();
  } else {
    const patterns = [
      /\b(?:role|position|engineer|developer|designer|manager|job|opportunity|opening)\s+at\s+([A-Z][A-Za-z0-9\s\.\,\-\&]{1,30})/i,
      /\b(?:hiring\s+at|join)\s+([A-Z][A-Za-z0-9\s\.\,\-\&]{1,30})/i,
      /\bat\s+([A-Z][A-Za-z0-9\-\&]{2,30})/
    ];
    
    let matchedCompany = "";
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const potentialCompany = match[1].trim().replace(/[\.\,\!\?\)]+$/, "");
        const lowerPotential = potentialCompany.toLowerCase();
        const roleStopWords = ["senior", "junior", "lead", "remote", "hybrid", "onsite", "full-time", "part-time", "contract", "developer", "engineer", "designer", "manager", "hiring", "apply", "a ", "the ", "an "];
        
        if (roleStopWords.some(word => lowerPotential.startsWith(word) || lowerPotential.endsWith(word))) {
          continue;
        }
        
        matchedCompany = potentialCompany;
        break;
      }
    }
    
    if (matchedCompany) {
      company = matchedCompany;
    } else {
      company = "Unknown Company";
    }
  }

  // 4. Description
  const description = text.trim();

  // 5. Location
  let location = "Remote";
  const locationMatch = text.match(/(?:Location|Workplace|Job Location|Office)\s*:\s*(.*)/i);
  if (locationMatch) {
    location = locationMatch[1].trim();
  } else if (textLower.includes("on-site") || textLower.includes("onsite") || textLower.includes("in-office")) {
    location = "On-site";
  } else if (textLower.includes("hybrid")) {
    location = "Hybrid";
  }

  // 6. Application URL
  let url = "";
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  if (urlMatch) {
    url = urlMatch[0].trim().replace(/[\.\,\?\!\)]+$/, "");
  }

  // 7. Posted Date
  const postedAt = date ? new Date(date * 1000) : new Date();

  // 8. Employment Type
  let employmentType = "Full-time";
  if (textLower.includes("contract") || textLower.includes("contractor") || textLower.includes("freelance")) {
    employmentType = "Contract";
  } else if (textLower.includes("part-time") || textLower.includes("part time")) {
    employmentType = "Part-time";
  } else if (textLower.includes("intern") || textLower.includes("internship")) {
    employmentType = "Internship";
  }

  // 9. Experience
  let experience = "";
  const expMatch = text.match(/(?:Experience|ExpRequired|Exp|Yrs of Exp)\s*:\s*(.*)/i);
  if (expMatch) {
    experience = expMatch[1].trim();
  } else {
    const expRegexMatch = text.match(/(\d+\s*\+?\s*(?:year|yr)s?)/i);
    if (expRegexMatch) {
      experience = expRegexMatch[1].trim();
    }
  }

  // 10. Skills
  let skills = [];
  const skillsMatch = text.match(/(?:Skills|Technologies|Stack|Requirements|Tech Stack)\s*:\s*(.*)/i);
  if (skillsMatch) {
    let skillsText = skillsMatch[1];
    
    // Remove URLs from skillsText before splitting so that URL slashes don't break parsing
    skillsText = skillsText.replace(/https?:\/\/[^\s]+/gi, "");

    const sentenceEndIndex = skillsText.indexOf(". ");
    if (sentenceEndIndex !== -1) {
      skillsText = skillsText.substring(0, sentenceEndIndex);
    }
    
    skills = skillsText
      .split(/[,/;|]/)
      .map((s) => s.trim().replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, ""))
      .filter((s) => {
        if (!s) return false;
        if (s.match(/https?:\/\/[^\s]+/i)) return false;
        if (s.includes("@")) return false;
        
        const spaceCount = (s.match(/ /g) || []).length;
        if (spaceCount > 2) return false;
        
        const sLower = s.toLowerCase();
        const invalidKeywords = ["referral", "contact", "available", "hiring", "apply", "opportunity", "details", "role", "netflix", "remote"];
        if (invalidKeywords.some(keyword => sLower.includes(keyword))) return false;
        
        return true;
      });
  } else {
    // Basic search of keywords
    const commonSkills = [
      "javascript", "typescript", "node.js", "nodejs", "node", "react", "vue",
      "angular", "python", "java", "c++", "go", "ruby", "aws", "docker",
      "kubernetes", "mongodb", "sql", "postgres", "swift", "kotlin"
    ];
    commonSkills.forEach((skill) => {
      if (textLower.includes(skill)) {
        skills.push(skill);
      }
    });
  }

  // 11. Referral Availability and Details
  let referralAvailable = false;
  let contactUser = "";

  const referralKeywords = [
    "referral",
    "employee referral",
    "referral available",
    "refer"
  ];
  const hasReferralKeyword = referralKeywords.some(kw => textLower.includes(kw));

  const contactActionPattern = /\b(?:contact|dm|ping|message)\s+@(\w+)/i;
  const contactActionMatch = text.match(contactActionPattern);

  if (hasReferralKeyword || contactActionMatch) {
    referralAvailable = true;
  }

  if (contactActionMatch) {
    contactUser = contactActionMatch[1].trim();
  } else {
    const anyUsernameMatch = text.match(/@(\w+)/);
    if (anyUsernameMatch) {
      contactUser = anyUsernameMatch[1].trim();
    }
  }

  return {
    title,
    company,
    description,
    location,
    url: url || undefined,
    source: "telegram",
    postedAt,
    employmentType,
    experience,
    skills,
    referralAvailable,
    telegramMessageId: `telegram_${chatId}_${messageId}`,
    referralDetails: {
      postId: String(messageId),
      channelName: String(chatId),
      contactUser: contactUser || undefined,
    },
  };
};
