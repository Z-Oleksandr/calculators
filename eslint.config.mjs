import js from "@eslint/js";
import globals from "globals";

export default [
    { ignores: ["dist/", "node_modules/", "coverage/"] },
    js.configs.recommended,
    {
        rules: {
            eqeqeq: ["error", "smart"],
            "no-var": "error",
            "prefer-const": "error",
            "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
        },
    },
    {
        files: [
            "app.js",
            "webpack.config.js",
            "src/server/**/*.js",
            "test/**/*.js",
        ],
        languageOptions: { sourceType: "commonjs", globals: globals.node },
    },
    {
        files: ["test/**/*.mjs", "eslint.config.mjs"],
        languageOptions: { globals: globals.node },
    },
    {
        files: ["src/script/**/*.js"],
        languageOptions: { sourceType: "module", globals: globals.browser },
    },
    {
        files: ["public/js/**/*.js"],
        languageOptions: { sourceType: "script", globals: globals.browser },
    },
];
