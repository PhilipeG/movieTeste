import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

const config = [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "*.tsbuildinfo"],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Decisão consciente: mantemos <img> com w342 + loading="lazy".
      // next/image fica para uma fase futura (ver PROJECT_REVIEW.md).
      "@next/next/no-img-element": "off",

      // Regra nova do react-hooks-plugin (set-state-in-effect) é muito ruidosa
      // para o padrão atual de hidratação/inicialização. Manter como hint na IDE,
      // mas não falhar o build.
      "react-hooks/set-state-in-effect": "off",

      // `any` é tech debt pré-existente — visível como warning, sem bloquear build.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]

export default config
