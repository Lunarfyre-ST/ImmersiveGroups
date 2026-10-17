
export default [
  {
    // Ignore generated and third-party code globally, before matching sources.
    ignores: [
      "node_modules/**",
      "docs/**",
      "vendor/**",
      "gallery/dist/**",
      "tests/artifacts/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
    rules: {
      "no-debugger": "warn",
      "no-constant-condition": "warn",
      "no-unreachable": "error",
      "no-unsafe-finally": "error",
      "no-duplicate-case": "error",
    },
  },
  {
    files: ["gallery/src/**/*.js"],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: { sourceType: "commonjs" },
  },
];
