/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0b0f19',
        card: '#0f172a',
        border: '#1e293b',
        muted: '#64748b',
        foreground: '#f1f5f9',
        primary: {
          DEFAULT: '#2563eb',
          hover: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
};