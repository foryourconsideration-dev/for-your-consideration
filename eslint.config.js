import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintPluginAstro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";

const recommendedTypeScriptRules = Object.assign(
  {},
  ...tseslint.configs.recommended.map((config) => config.rules),
);

export default defineConfig([
  globalIgnores([".astro/", "dist/", "src/types/database.ts"]),
  {
    name: "project/javascript-and-typescript",
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  ...eslintPluginAstro.configs.recommended,
  {
    name: "project/astro-typescript",
    files: ["**/*.astro"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...recommendedTypeScriptRules,
    },
  },
]);
