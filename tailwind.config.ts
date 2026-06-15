import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // New brand palette
        ink: "#1A60AB",        // Deep Brand Blue — primary text/brand
        board: "#0F3A6B",      // darkened brand blue for sidebar/dark surfaces
        boardDeep: "#0A2A4F",  // deepest shade for gradients
        chalk: "#F6F6F3",      // Light Gray Background
        gold: {
          DEFAULT: "#EFAE56",  // Gold/Orange accent
          soft: "#F4C078",
          pale: "#FDF3E3",
          deep: "#C8881F",
        },
        sky: "#7BA3CA",        // Light Blue — shading/secondary
        mist: "#D6E3E9",       // Pale Blue-Gray — subtle highlights
        line: "#D6E3E9",       // borders use the pale blue-gray
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-roboto)", "sans-serif"],
        mono: ["var(--font-fira)", "monospace"]
      },
      boxShadow: {
        card: "0 1px 2px rgba(26,96,171,.06), 0 8px 24px rgba(26,96,171,.08)",
        lift: "0 12px 40px rgba(26,96,171,.16)"
      }
    }
  },
  plugins: []
};
export default config;
