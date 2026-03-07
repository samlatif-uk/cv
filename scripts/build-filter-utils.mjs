import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const typescript = require("../react.samlatif.uk/node_modules/typescript");

const sourcePath = resolve("shared/src/filter-utils.ts");
const outputPath = resolve("shared/filter-utils.js");

const source = await readFile(sourcePath, "utf8");

const transpiled = typescript.transpileModule(source, {
  compilerOptions: {
    target: typescript.ScriptTarget.ES2019,
    module: typescript.ModuleKind.CommonJS,
    strict: true,
  },
  fileName: sourcePath,
});

const output = `// Generated from shared/src/filter-utils.ts. Do not edit directly.\n(function (globalScope) {\n  const module = { exports: {} };\n  const exports = module.exports;\n${transpiled.outputText.replace(/^(?!$)/gm, "  ")}\n  globalScope.CVFilterUtils = module.exports.CVFilterUtils || exports.CVFilterUtils;\n})(typeof window !== \"undefined\" ? window : globalThis);\n`;

await writeFile(outputPath, output, "utf8");
