import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        aether: { bg: "#050505", surface: "#0A0A0A", card: "#111111", border: "#1F1F1F", accent: "#C5A46E", accentBlue: "#3B82F6", text: "#F5F5F5", muted: "#A1A1AA", success: "#22C55E", warning: "#EAB308", danger: "#EF4444" }
      }
    }
  },
  plugins: []
};
export default config;