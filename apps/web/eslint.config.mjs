import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactPlugin from "eslint-plugin-react";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Project ignores
    "node_modules/**",
    "dist/**",
    "coverage/**",
    "**/*.min.js",
    "debug-*.js",
    "check-*.js",
    "*.cjs",
    "*.py",
  ]),
  {
    plugins: {
      react: reactPlugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "react-hooks/incompatible-library": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/set-state-in-effect": "off",
      "react/no-children-prop": "off",
      "react/forbid-elements": [
        "error",
        {
          "forbid": [
            {
              "element": "input",
              "message": "Use shared <Input /> component instead."
            }
          ]
        }
      ]
    },
  },
]);

export default eslintConfig;
