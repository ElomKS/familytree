/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#f5ebe0",
          dark: "#e8ddd3",
          deep: "#d5c9bb",
        },
        panel: {
          DEFAULT: "#1D2330",
          input: "#14181F",
        },
        border: {
          DEFAULT: "#313A4E",
          hover: "#454F68",
        },
        ink: {
          DEFAULT: "#111827",
          muted: "#9098AD",
          subtle: "#5A6278",
          request: "#8B98B8",
          light: "#EDEAE2",
        },
        accent: {
          DEFAULT: "#C79A56",
          hover: "#D9AC68",
        },
        danger: {
          DEFAULT: "#C1584C",
          hover: "#D2685C",
          text: "#1D0F0D",
        },
        success: "#6B9A78",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
