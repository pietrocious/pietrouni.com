/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "./vault/**/*.md"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        // Display/Headline Font
        sans: ['"Playfair Display"', "serif"],
        // Serif Body Font
        serif: ['"Lora"', "serif"],
        headline: ['"Playfair Display"', "serif"],
        // System Fonts
        ui: ['"Noto Sans"', "sans-serif"],
        kernel: ['"Fixedsys"', "monospace"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      colors: {
        // colour palette
        her: {
          red: "#4A7C9D", // Blue accent color
          orange: "#5B9AB8", // Lighter blue
          cream: "#F4EBD9", // Paper background
          paper: "#FDFBF7", // Brighter paper
          dark: "#3E2723", // Deep warm brown
          darker: "#2D1A14", // Darkest brown
          text: "#4E342E", // Standard text
          textLight: "#EFEBE9", // Light text
        },
      },
      animation: {
        "gradient-x": "gradient-x 30s ease infinite",
        "dock-bounce": "dockBounce 0.5s ease",
      },
      keyframes: {
        "gradient-x": {
          "0%, 100%": {
            "background-size": "200% 200%",
            "background-position": "left center",
          },
          "50%": {
            "background-size": "200% 200%",
            "background-position": "right center",
          },
        },
        dockBounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};
