import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0faf4",
          100: "#d6f0e0",
          200: "#a8ddb8",
          300: "#6ec28e",
          400: "#3da96a",
          500: "#2d8a56",
          600: "#237048",
          700: "#1c5a3a",
          800: "#17472f",
          900: "#0f3321",
        },
        accent: {
          50: "#fef5f0",
          100: "#fde8da",
          200: "#fbceb0",
          300: "#f7a97a",
          400: "#f28c52",
          500: "#e8723a",
          600: "#d45a28",
          700: "#b04520",
          800: "#8e381b",
          900: "#6d2c17",
        },
        warm: {
          50: "#fdfaf6",
          100: "#faf3ea",
          200: "#f5e6d0",
          300: "#edd3ac",
          400: "#e0b87a",
          500: "#d4a05a",
          600: "#c08940",
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
        'card-hover': '0 2px 6px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.05)',
        'float': '0 8px 32px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
