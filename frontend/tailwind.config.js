/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          light: '#e8f0fe',
          DEFAULT: '#1a73e8',
          dark: '#1558b0',
        },
        green: {
          light: '#e6f4ea',
          DEFAULT: '#34a853',
        },
        red: {
          light: '#fce8e6',
          DEFAULT: '#ea4335',
        },
        orange: {
          light: '#fef7e0',
          DEFAULT: '#fbbc04',
        },
        gray: {
          light: '#f1f3f4',
          border: '#dadce0',
          DEFAULT: '#5f6368',
        },
      }
    },
  },
  plugins: [],
}
