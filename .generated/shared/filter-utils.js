(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CVFilterUtils = exports.normalizeTechToken = exports.splitTechItems = exports.isSkillMatch = exports.normalizeSkillValue = void 0;
    const TECH_TOKEN_ALIASES = {
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
    ];
    const normalizeSkillValue = (skill) => String(skill || "").trim();
    exports.normalizeSkillValue = normalizeSkillValue;
    const normalizeSkillKey = (skill) => (0, exports.normalizeSkillValue)(skill).toLowerCase();
    const FUZZY_SKILL_LOOKUP = new Map(FUZZY_SKILL_GROUPS.flatMap((group) => {
        const normalizedGroup = group.map(normalizeSkillKey);
        return normalizedGroup.map((skill) => [skill, normalizedGroup]);
    }));
    const isSkillMatch = (filterSkill, jobSkill) => {
        var _a;
        const normalizedFilterSkill = normalizeSkillKey(filterSkill);
        const normalizedJobSkill = normalizeSkillKey(jobSkill);
        if (normalizedFilterSkill === normalizedJobSkill) {
            return true;
        }
        const fuzzyMatches = FUZZY_SKILL_LOOKUP.get(normalizedFilterSkill);
        return (_a = fuzzyMatches === null || fuzzyMatches === void 0 ? void 0 : fuzzyMatches.includes(normalizedJobSkill)) !== null && _a !== void 0 ? _a : false;
    };
    exports.isSkillMatch = isSkillMatch;
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
    exports.splitTechItems = splitTechItems;
    const normalizeTechToken = (token) => {
        var _a;
        return (_a = TECH_TOKEN_ALIASES[token]) !== null && _a !== void 0 ? _a : [token];
    };
    exports.normalizeTechToken = normalizeTechToken;
    exports.CVFilterUtils = {
        normalizeSkillValue: exports.normalizeSkillValue,
        isSkillMatch: exports.isSkillMatch,
        splitTechItems: exports.splitTechItems,
        normalizeTechToken: exports.normalizeTechToken,
    };
    if (typeof window !== "undefined") {
        Object.assign(window, { CVFilterUtils: exports.CVFilterUtils });
    }
});
