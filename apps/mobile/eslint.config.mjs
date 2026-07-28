import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactNative from "eslint-plugin-react-native";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  reactHooks.configs.flat["recommended-latest"],
  {
    plugins: {
      "react-native": reactNative,
    },
    languageOptions: {
      globals: {
        __DEV__: "readonly",
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["error", "warn"] }],
      "react-hooks/exhaustive-deps": "warn",
      // Downgraded: react-native-reanimated's `.value` mutation and
      // fetch-on-mount effects are idiomatic here; these compiler-readiness
      // rules flag them broadly rather than something actually broken.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-native/no-unused-styles": "warn",
      "react-native/no-inline-styles": "warn",
      "react-native/split-platform-components": "warn",
      "react-native/no-single-element-style-arrays": "warn",
    },
  },
  {
    ignores: ["node_modules/**", ".expo/**", "dist/**", "ios/**", "android/**"],
  },
];
