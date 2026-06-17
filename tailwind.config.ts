import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./domain/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core theme tokens (kept generic — domain palette lives in config.ts)
        bg: "#0E1116",
        surface: "#161B22",
        surface2: "#1C2230",
        border: "#262C38",
        accent: "#FF8A3D",
        muted: "#94A3B8",
        ink: "#E6EDF3",
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
