import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#122321",
        moss: "#526d61",
        paper: "#f3f6ef",
        mint: "#c9e8c4",
        coral: "#f4a07a",
      },
      boxShadow: {
        soft: "0 20px 60px rgba(20, 54, 45, 0.09)",
      },
    },
  },
  plugins: [],
};

export default config;
