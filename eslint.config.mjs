import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // наши общие правила поверх next + ts
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
      import: importPlugin,
    },
    rules: {
      // сортировка импортов
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      // Circular imports are hard to debug at scale (L-6).
      "import/no-cycle": ["warn", { maxDepth: 4 }],
    },
  },

  // отключаем конфликтующие стилистические правила в пользу Prettier
  prettierConfig,

  // игноры
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Serwist build output (see serwist.config.mjs)
    "public/sw.js",
    "public/sw.js.map",
    "public/swe-worker*",
  ]),
]);

export default eslintConfig;
