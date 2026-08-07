/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Verde nopal — color principal de marca.
        nopal: {
          50: "#f0f7f2",
          100: "#dcebe0",
          200: "#bad8c4",
          300: "#8dbc9e",
          400: "#5c9a75",
          500: "#3b7d59",
          600: "#2a6446",
          700: "#225039",
          800: "#1c3f2e",
          900: "#132a1f",
          950: "#0a1812",
        },
        // Arena / tierra árida — fondos cálidos y acentos.
        arena: {
          50: "#faf8f3",
          100: "#f3efe3",
          200: "#e6dcc5",
          300: "#d5c4a1",
          400: "#c2a87c",
          500: "#b08f5e",
          600: "#96744c",
          700: "#7a5c40",
          800: "#654c39",
          900: "#554031",
        },
        // Acento cálido — tuna / fruto del nopal.
        tuna: {
          400: "#e8734a",
          500: "#d9552c",
          600: "#b94222",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      maxWidth: {
        content: "72rem",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};
