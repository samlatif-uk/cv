const SKILL_TOKEN_SEPARATOR = /[/|]/;

const TECH_TOKEN_ALIASES: Record<string, string[]> = {
  "JS (OOP, Functional, FRP)": ["JavaScript (ES5)", "JavaScript (ES6+)"],
  "CSS / SCSS / SASS / LESS": ["CSS3 / SCSS / LESS"],
  "Magento/OSCommerce": ["Magento"],
  "Canvas (FabricJS, PixiJS)": ["Canvas"],
};

const normalizeSkillValue = (skill: string) => String(skill || "").trim();

const splitSkillTokens = (skill: string) =>
  normalizeSkillValue(skill)
    .split(SKILL_TOKEN_SEPARATOR)
    .map((token) => token.trim())
    .filter(Boolean);

export const isSkillMatch = (filterSkill: string, jobSkill: string) => {
  const filterTokens = splitSkillTokens(filterSkill);
  const jobTokens = splitSkillTokens(jobSkill);

  return filterTokens.some(
    (token) =>
      jobTokens.includes(token) ||
      jobTokens.some((item) => item.includes(token) || token.includes(item)),
  );
};

export const splitTechItems = (items: string) => {
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

export const normalizeTechToken = (token: string) => {
  return TECH_TOKEN_ALIASES[token] ?? [token];
};
