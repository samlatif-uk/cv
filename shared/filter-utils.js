(function (globalScope) {
  const normalizeSkillValue = (skill) => String(skill || "").trim();

  const isSkillMatch = (filterSkill, jobSkill) => {
    return normalizeSkillValue(filterSkill) === normalizeSkillValue(jobSkill);
  };

  const splitTechItems = (items) => {
    const parts = [];
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

  const normalizeTechToken = (token) => {
    const aliasMap = {
      "JS (OOP, Functional, FRP)": ["JavaScript (ES5)", "JavaScript (ES6+)"],
      "CSS / SCSS / SASS / LESS": ["CSS3 / SCSS / LESS"],
      "Magento/OSCommerce": ["Magento"],
      "Canvas (FabricJS, PixiJS)": ["Canvas"],
    };

    return aliasMap[token] || [token];
  };

  globalScope.CVFilterUtils = {
    normalizeSkillValue,
    isSkillMatch,
    splitTechItems,
    normalizeTechToken,
  };
})(typeof window !== "undefined" ? window : globalThis);
