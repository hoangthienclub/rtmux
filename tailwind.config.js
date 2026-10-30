/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'var(--app-font-family)',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Inter',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif'
        ],
        mono: [
          '"Cascadia Code"',
          '"Cascadia Mono"',
          '"Segoe UI Mono"',
          '"JetBrains Mono"',
          'Consolas',
          'Menlo',
          'monospace'
        ],
      },
      colors: {
        cyber: {
          bg: '#080b11',
          sidebar: '#0d111a',
          card: '#121622',
          cardBorder: '#1e2638',
          emerald: '#10b981',
          emeraldGlow: '#00ffc8',
          muted: '#8e9aa8',
          darkMuted: '#475569',
        }
      }
    },
  },
  plugins: [],
}
