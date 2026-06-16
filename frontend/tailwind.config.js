/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkBg: '#0f172a',      // slate-900
        darkCard: '#1e293b',    // slate-800
        darkBorder: '#334155',  // slate-700
        cricketGreen: {
          light: '#4ade80',     // green-400
          DEFAULT: '#22c55e',   // green-500
          dark: '#16a34a',      // green-600
        },
        cricketAmber: {
          light: '#fde047',     // yellow-300
          DEFAULT: '#f59e0b',   // amber-500
          dark: '#d97706',      // amber-600
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
