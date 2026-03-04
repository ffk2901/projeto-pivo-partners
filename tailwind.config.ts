import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#F7F4F1",
          100: "#ECE7E1",
          200: "#E6DBD3",
          300: "#DFD7C4",
          400: "#C9B9A3",
          500: "#AF8A6D",
          600: "#96714F",
          700: "#7A5A3E",
          800: "#4A3228",
          900: "#1C0016",
        },
        surface: {
          0:   "#FFFFFF",
          50:  "#FAF8F6",
          100: "#F5F1ED",
          200: "#ECE7E1",
        },
        ink: {
          900: "#1C0016",
          800: "#323232",
          700: "#4A4A4A",
          600: "#636363",
          500: "#808080",
          400: "#A0A0A0",
          300: "#C0C0C0",
          200: "#DCDCDC",
          100: "#F0F0F0",
        },
      },
    },
  },
  plugins: [],
};
export default config;
