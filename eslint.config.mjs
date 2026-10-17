
export default [
  {
    files: ["**/*.js", "**/*.mjs"],
    ignores: [
      "node_modules/**",
      "docs/**",
      "vendor/**",
    ],
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
];
