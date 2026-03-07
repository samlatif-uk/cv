const TECH_TOKEN_ALIASES: Record<string, string[]> = {
  "JS (OOP, Functional, FRP)": ["JavaScript (ES5)", "JavaScript (ES6+)"],
  "CSS / SCSS / SASS / LESS": ["CSS3 / SCSS / LESS"],
  "Magento/OSCommerce": ["Magento"],
  "Canvas (FabricJS, PixiJS)": ["Canvas"],
};

const FUZZY_SKILL_GROUPS = [
  [
    "React",
    "React 0.13/14",
    "React 0.15",
    "React 15/16",
    "React 16",
    "React 18",
    "React 19",
  ],
  ["CSS", "CSS3", "SASS", "SCSS", "LESS"],
  ["HTML", "HTML5"],
  ["JavaScript", "JavaScript (ES5)", "JavaScript (ES6+)"],
  ["Bootstrap", "Bootstrap 3"],
  ["Redux Form", "Redux-Form"],
] as const;

export const normalizeSkillValue = (skill: string) =>
  String(skill || "").trim();

const normalizeSkillKey = (skill: string) =>
  normalizeSkillValue(skill).toLowerCase();

const FUZZY_SKILL_LOOKUP = new Map(
  FUZZY_SKILL_GROUPS.flatMap((group) => {
    const normalizedGroup = group.map(normalizeSkillKey);
    return normalizedGroup.map((skill) => [skill, normalizedGroup] as const);
  }),
);

export const isSkillMatch = (filterSkill: string, jobSkill: string) => {
  const normalizedFilterSkill = normalizeSkillKey(filterSkill);
  const normalizedJobSkill = normalizeSkillKey(jobSkill);

  if (normalizedFilterSkill === normalizedJobSkill) {
    return true;
  }

  const fuzzyMatches = FUZZY_SKILL_LOOKUP.get(normalizedFilterSkill);
  return fuzzyMatches?.includes(normalizedJobSkill) ?? false;
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

export const CVFilterUtils = {
  normalizeSkillValue,
  isSkillMatch,
  splitTechItems,
  normalizeTechToken,
};

if (typeof window !== "undefined") {
  Object.assign(window, { CVFilterUtils });
}
