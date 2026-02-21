(function (globalScope) {
  const splitSkillTokens = (skill) => {
    return skill
      .toLowerCase()
      .split("/")
      .map((token) => token.trim())
      .filter(Boolean);
  };

  const isSkillMatch = (filterSkill, jobSkill) => {
    if (filterSkill === "React") {
      return /^React(?:\s|$)/.test(jobSkill) && jobSkill !== "React Native";
    }

    if (filterSkill === jobSkill) {
      return true;
    }

    const filterTokens = splitSkillTokens(filterSkill);
    const jobTokens = splitSkillTokens(jobSkill);

    return filterTokens.some((filterToken) =>
      jobTokens.some(
        (jobToken) =>
          jobToken === filterToken ||
          jobToken.includes(filterToken) ||
          filterToken.includes(jobToken),
      ),
    );
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
    splitSkillTokens,
    isSkillMatch,
    splitTechItems,
    normalizeTechToken,
  };
})(typeof window !== "undefined" ? window : globalThis);
