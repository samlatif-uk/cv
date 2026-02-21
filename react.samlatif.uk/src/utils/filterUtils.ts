const splitSkillTokensFallback = (skill: string) => {
  return skill
    .toLowerCase()
    .split("/")
    .map((token) => token.trim())
    .filter(Boolean);
};

const isSkillMatchFallback = (filterSkill: string, jobSkill: string) => {
  if (filterSkill === "React") {
    return /^React(?:\s|$)/.test(jobSkill) && jobSkill !== "React Native";
  }

  if (filterSkill === jobSkill) {
    return true;
  }

  const filterTokens = splitSkillTokensFallback(filterSkill);
  const jobTokens = splitSkillTokensFallback(jobSkill);

  return filterTokens.some((filterToken) =>
    jobTokens.some(
      (jobToken) =>
        jobToken === filterToken ||
        jobToken.includes(filterToken) ||
        filterToken.includes(jobToken),
    ),
  );
};

const splitTechItemsFallback = (items: string) => {
  const parts: string[] = [];
  let current = "";
  let depth = 0;

  for (const char of items) {
    if (char === "(") {
      depth += 1;
      current += char;
      continue;
    }

    if (char === ")") {
      depth = Math.max(0, depth - 1);
      current += char;
      continue;
    }

    if (char === "," && depth === 0) {
      const token = current.trim();
      if (token) {
        parts.push(token);
      }
      current = "";
      continue;
    }

    current += char;
  }

  const last = current.trim();
  if (last) {
    parts.push(last);
  }

  return parts;
};

const normalizeTechTokenFallback = (token: string) => {
  const aliasMap: Record<string, string[]> = {
    "JS (OOP, Functional, FRP)": ["JavaScript (ES5)", "JavaScript (ES6+)"],
    "CSS / SCSS / SASS / LESS": ["CSS3 / SCSS / LESS"],
    "Magento/OSCommerce": ["Magento"],
    "Canvas (FabricJS, PixiJS)": ["Canvas"],
  };

  return aliasMap[token] ?? [token];
};

const getUtils = () => {
  return window.CVFilterUtils;
};

export const isSkillMatch = (filterSkill: string, jobSkill: string) => {
  const utils = getUtils();
  if (utils) {
    return utils.isSkillMatch(filterSkill, jobSkill);
  }

  return isSkillMatchFallback(filterSkill, jobSkill);
};

export const splitTechItems = (items: string) => {
  const utils = getUtils();
  if (utils) {
    return utils.splitTechItems(items);
  }

  return splitTechItemsFallback(items);
};

export const normalizeTechToken = (token: string) => {
  const utils = getUtils();
  if (utils) {
    return utils.normalizeTechToken(token);
  }

  return normalizeTechTokenFallback(token);
};
