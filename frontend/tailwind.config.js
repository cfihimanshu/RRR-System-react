/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-card': 'var(--bg-card)',
        'bg-input': 'var(--bg-input)',
        'border': 'var(--border)',
        'border-light': 'var(--border-light)',
        'accent': 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-soft': 'var(--accent-soft)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        blue: {
          soft: 'var(--blue-soft)',
          DEFAULT: 'var(--blue)',
        },
        green: {
          soft: 'var(--green-soft)',
          DEFAULT: 'var(--green)',
        },
        red: {
          soft: 'var(--red-soft)',
          DEFAULT: 'var(--red)',
        },
        orange: {
          soft: 'var(--orange-light)',
          DEFAULT: 'var(--orange)',
        },
        purple: {
          soft: 'var(--purple-soft)',
          DEFAULT: 'var(--purple)',
        },
        yellow: {
          soft: 'var(--yellow-soft)',
          DEFAULT: 'var(--yellow)',
        }
      }
    },
  },
  plugins: [],
}
