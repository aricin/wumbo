import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    ignores: ["coverage/**", "playwright-report/**", "storybook-static/**", "test-results/**"],
  },
];

export default config;
