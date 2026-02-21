/// <reference types="vite/client" />

interface CVFilterUtilsApi {
  splitSkillTokens: (skill: string) => string[];
  isSkillMatch: (filterSkill: string, jobSkill: string) => boolean;
  splitTechItems: (items: string) => string[];
  normalizeTechToken: (token: string) => string[];
}

interface Window {
  CVFilterUtils?: CVFilterUtilsApi;
}
