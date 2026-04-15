import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'sage-green': {
          DEFAULT: '#4B5D4D',
          50: '#EEF1EE',
          100: '#D8DED9',
          200: '#B4BEB6',
          300: '#8F9E91',
          400: '#6B7E6D',
          500: '#4B5D4D',
          600: '#3C4B3E',
          700: '#2D392E',
          800: '#1E261F',
          900: '#0F130F',
        },
        terracotta: {
          DEFAULT: '#B25E4C',
          50: '#F8EDEB',
          100: '#F0D5D0',
          200: '#E1ABA1',
          300: '#D28172',
          400: '#C25E4C',
          500: '#B25E4C',
          600: '#8E4B3C',
          700: '#6B382D',
          800: '#47251E',
          900: '#24130F',
        },
        cream: {
          DEFAULT: '#FDF8ED',
          50: '#FFFFFF',
          100: '#FDF8ED',
          200: '#FAF0D4',
          300: '#F6E4B2',
          400: '#F2D88F',
          500: '#EDCB6D',
        },
        charcoal: {
          DEFAULT: '#2D312E',
          50: '#E8E9E8',
          100: '#CDD0CE',
          200: '#9BA09C',
          300: '#69706B',
          400: '#3E4440',
          500: '#2D312E',
          600: '#232725',
          700: '#1A1D1B',
          800: '#111311',
          900: '#080908',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        glass: '0 4px 30px rgba(0, 0, 0, 0.1)',
        card: '0 2px 16px rgba(45, 49, 46, 0.08)',
      },
    },
  },
  plugins: [forms],
};

export default config;
