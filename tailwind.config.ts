import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0a0e14",
          900: "#0f141d",
          850: "#141b26",
          800: "#1a2230",
          700: "#26303f",
          600: "#3a4658",
        },
        accent: {
          DEFAULT: "#39d0a3",
          soft: "#2bb98f",
          dim: "#1c6e58",
        },
        gold: "#e9b949",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
