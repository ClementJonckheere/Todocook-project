import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextCoreWebVitals,
  {
    rules: {
      // Règles ajoutées avec eslint-plugin-react-hooks 7 (Next 16). Elles signalent des schémas
      // déjà présents (chargement de données dans useEffect, fonctions déclarées après l'effet
      // qui les appelle) qui fonctionnent correctement : avertissements, à résorber progressivement.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "mobile/**", "public/sw.js", "scripts/generate-icons.js", "next-env.d.ts"],
  },
];

export default config;
