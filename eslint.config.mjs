import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

// Flat config (ESLint 9). Reemplaza `.eslintrc.json` + `next lint` (deprecado,
// se elimina en Next 16). FlatCompat adapta el config legacy de
// `eslint-config-next`, que aún no exporta flat config.
const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals"),
];

export default eslintConfig;
