/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./client/index.html",
    "./client/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "rgb(var(--color-terminal-bg) / <alpha-value>)",
          card: "rgb(var(--color-terminal-card) / <alpha-value>)",
          panel: "rgb(var(--color-terminal-panel) / <alpha-value>)",
          elevated: "rgb(var(--color-terminal-elevated) / <alpha-value>)",
          border: "rgb(var(--color-terminal-border) / <alpha-value>)",
          borderSubtle: "rgb(var(--color-terminal-border-subtle) / <alpha-value>)",
          hover: "rgb(var(--color-terminal-hover) / <alpha-value>)",
          text: "rgb(var(--color-terminal-text) / <alpha-value>)",
          muted: "rgb(var(--color-terminal-muted) / <alpha-value>)"
        },
        bull: {
          DEFAULT: "rgb(var(--color-bull) / <alpha-value>)",
          subtle: "rgb(var(--color-bull-subtle) / <alpha-value>)",
          text: "rgb(var(--color-bull) / <alpha-value>)",
          border: "rgb(var(--color-bull-border) / <alpha-value>)"
        },
        bear: {
          DEFAULT: "rgb(var(--color-bear) / <alpha-value>)",
          subtle: "rgb(var(--color-bear-subtle) / <alpha-value>)",
          text: "rgb(var(--color-bear) / <alpha-value>)",
          border: "rgb(var(--color-bear-border) / <alpha-value>)"
        },
        amber: {
          DEFAULT: "rgb(var(--color-amber) / <alpha-value>)",
          subtle: "rgb(var(--color-amber-subtle) / <alpha-value>)",
          text: "rgb(var(--color-amber) / <alpha-value>)",
          border: "rgb(var(--color-amber-border) / <alpha-value>)"
        },
        accent: {
          cyan: "rgb(var(--color-accent-cyan) / <alpha-value>)",
          sky: "rgb(var(--color-accent-sky) / <alpha-value>)",
          purple: "rgb(var(--color-accent-purple) / <alpha-value>)"
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        'terminal': '8px',
        'terminal-lg': '12px',
        'terminal-xl': '16px',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'elevated': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'atm-glow': '0 0 15px rgba(2, 132, 199, 0.25)',
      },
      animation: {
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.15s ease-out forwards',
        'slide-down': 'slideDown 0.15s ease-out forwards',
      },
      keyframes: {
        pulseSubtle: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideDown: {
          '0%': { opacity: 0, transform: 'translateY(-6px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
