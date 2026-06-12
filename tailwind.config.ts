import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A1F3D",
        board: "#06152B",
        chalk: "#F5F2EA",
        gold: { DEFAULT: "#E8841C", soft: "#F7A84B", pale: "#FDF1E3", deep: "#B85F08" },
        line: "#E4E0D6"
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-roboto)", "sans-serif"],
        mono: ["var(--font-fira)", "monospace"]
      },
      boxShadow: {
        card: "0 1px 2px rgba(10,31,61,.06), 0 8px 24px rgba(10,31,61,.07)",
        lift: "0 12px 40px rgba(10,31,61,.16)"
      }
    }
  },
  plugins: []
};
export default config;
