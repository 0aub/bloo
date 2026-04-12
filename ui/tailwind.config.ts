import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bloo: {
          bg: 'var(--bg)',
          card: 'var(--bg-card)',
          elevated: 'var(--bg-elevated)',
          fg: 'var(--fg)',
          muted: 'var(--fg-muted)',
          primary: 'var(--primary)',
          accent: 'var(--accent)',
          border: 'var(--border)',
        },
      },
      fontFamily: {
        sans: ['Almarai', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
