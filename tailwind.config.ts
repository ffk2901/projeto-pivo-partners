import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        DEFAULT: "1rem",
      },
      colors: {
        // Legacy brand tokens (backward compat)
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
        // Legacy surface tokens (backward compat)
        surface: {
          0:   "#FFFFFF",
          50:  "#FAF8F6",
          100: "#F5F1ED",
          200: "#ECE7E1",
        },
        // Legacy ink tokens (backward compat)
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
        // New Material Design 3 semantic tokens
        md: {
          surface:                    "#fdf9f5",
          on_surface:                 "#1c1c19",
          on_surface_variant:         "#4f453d",
          surface_container_lowest:   "#ffffff",
          surface_container_low:      "#f7f3ef",
          surface_container:          "#f1ede9",
          surface_container_high:     "#ebe7e3",
          surface_container_highest:  "#e6e2de",
          primary:                    "#78583e",
          primary_container:          "#af8a6d",
          on_primary:                 "#ffffff",
          on_primary_container:       "#2c1a0b",
          outline:                    "#81756c",
          outline_variant:            "#d3c4b9",
          secondary_container:        "#e8d5c4",
          tertiary_container:         "#c2e7c1",
          error:                      "#ba1a1a",
          error_container:            "#ffdad6",
        },
      },
      boxShadow: {
        ambient: "0px 8px 24px rgba(28, 28, 25, 0.04)",
        "ambient-lg": "0px 0px 40px rgba(28, 28, 25, 0.1)",
      },
    },
  },
  plugins: [],
};
export default config;
