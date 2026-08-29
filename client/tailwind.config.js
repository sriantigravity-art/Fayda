/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "rgb(var(--color-terminal-bg) / <alpha-value>)",
          card: "rgb(var(--color-terminal-card) / <alpha-value>)",
          panel: "rgb(var(--color-terminal-panel) / <alpha-value>)",
          border: "rgb(var(--color-terminal-border) / <alpha-value>)",
          hover: "rgb(var(--color-terminal-hover) / <alpha-value>)",
          text: "rgb(var(--color-terminal-text) / <alpha-value>)",
          muted: "rgb(var(--color-terminal-muted) / <alpha-value>)"
        },
        bull: {
          DEFAULT: "rgb(var(--color-bull) / <alpha-value>)",
          glow: "rgba(var(--color-bull), 0.25)",
          dark: "#008B58",
          subtle: "rgba(var(--color-bull), 0.1)"
        },
        bear: {
          DEFAULT: "rgb(var(--color-bear) / <alpha-value>)",
          glow: "rgba(var(--color-bear), 0.25)",
          dark: "#A31B39",
          subtle: "rgba(var(--color-bear), 0.1)"
        },
        amber: {
          DEFAULT: "rgb(var(--color-amber) / <alpha-value>)",
          glow: "rgba(var(--color-amber), 0.25)",
          subtle: "rgba(var(--color-amber), 0.1)"
        },
        accent: {
          cyan: "rgb(var(--color-accent-cyan) / <alpha-value>)",
          purple: "rgb(var(--color-accent-purple) / <alpha-value>)"
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flash-red': 'flashRed 1.2s infinite',
        'flash-green': 'flashGreen 1.2s infinite',
        'radar-sweep': 'radarSweep 4s linear infinite',
      },
      keyframes: {
        flashRed: {
          '0%, 100%': { borderColor: '#FF3B69', boxShadow: '0 0 15px rgba(255, 59, 105, 0.6)' },
          '50%': { borderColor: 'transparent', boxShadow: 'none' },
        },
        flashGreen: {
          '0%, 100%': { borderColor: '#00F59B', boxShadow: '0 0 15px rgba(0, 245, 155, 0.6)' },
          '50%': { borderColor: 'transparent', boxShadow: 'none' },
        }
      }
    },
  },
  plugins: [],
}
