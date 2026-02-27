const normalizeSkillValueFallback = (skill: string) =>
  String(skill || "").trim();

const splitSkillTokens = (skill: string) => {
  return normalizeSkillValueFallback(skill)
    .split(/[/|]/)
    .map((token) => token.trim())
    .filter(Boolean);
};

const isSkillMatchFallback = (filterSkill: string, jobSkill: string) => {
  const filterTokens = splitSkillTokens(filterSkill);
  const jobTokens = splitSkillTokens(jobSkill);

  return filterTokens.some(
    (token) =>
      jobTokens.includes(token) ||
      jobTokens.some((item) => item.includes(token) || token.includes(item)),
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

export const isSkillMatch = (filterSkill: string, jobSkill: string) => {
  return isSkillMatchFallback(filterSkill, jobSkill);
};

export const splitTechItems = (items: string) => {
  return splitTechItemsFallback(items);
};

export const normalizeTechToken = (token: string) => {
  return normalizeTechTokenFallback(token);
};
