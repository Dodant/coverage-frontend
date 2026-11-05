// ESLint flat config. eslint-config-next 15 still ships eslintrc-style presets, so FlatCompat adapts them.
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  { ignores: [".next*/**", "node_modules/**", "out/**", "public/**", "next-env.d.ts", ".playwright-mcp/**", "playwright-report/**", "test-results/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;
