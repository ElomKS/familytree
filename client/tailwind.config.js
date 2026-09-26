/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        "surface-dark": "rgb(var(--c-surface-dark) / <alpha-value>)",
        "surface-deep": "rgb(var(--c-surface-deep) / <alpha-value>)",
        panel: "rgb(var(--c-panel) / <alpha-value>)",
        "panel-input": "rgb(var(--c-panel-input) / <alpha-value>)",
        border: "rgb(var(--c-border) / <alpha-value>)",
        "border-hover": "rgb(var(--c-border-hover) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        "ink-muted": "rgb(var(--c-ink-muted) / <alpha-value>)",
        "ink-subtle": "rgb(var(--c-ink-subtle) / <alpha-value>)",
        "ink-request": "rgb(var(--c-ink-request) / <alpha-value>)",
        "ink-light": "rgb(var(--c-ink-light) / <alpha-value>)",
        accent: "rgb(var(--c-accent) / <alpha-value>)",
        "accent-hover": "rgb(var(--c-accent-hover) / <alpha-value>)",
        danger: "rgb(var(--c-danger) / <alpha-value>)",
        "danger-hover": "rgb(var(--c-danger-hover) / <alpha-value>)",
        "danger-text": "rgb(var(--c-danger-text) / <alpha-value>)",
        success: "rgb(var(--c-success) / <alpha-value>)",
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
