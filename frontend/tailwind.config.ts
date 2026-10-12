import type { Config } from 'tailwindcss';

/**
 * Palette: warm paper canvas, ink text, one deep-teal accent.
 * Status colours are muted so the three lanes read as state, not decoration.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F4F5F0',
        surface: '#FFFFFF',
        line: '#DCE0D8',
        ink: '#1C2B33',
        muted: '#5F6F78',
        accent: { DEFAULT: '#0E6257', soft: '#E2F0EC', ink: '#0A4A42' },
        todo: '#6B7C88',
        progress: '#A8660E',
        done: '#2D7A55',
        danger: '#B42318',
      },
      fontFamily: {
        sans: ['var(--font-vazir)', 'Tahoma', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
