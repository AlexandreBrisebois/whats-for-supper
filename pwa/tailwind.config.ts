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
        indigo: {
          DEFAULT: '#4F46E5',
          50: '#F0F4FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        pink: {
          DEFAULT: '#DB2777',
          50: '#FDF2F8',
          100: '#FCE7F3',
          200: '#FBCFE8',
          300: '#F8B4D6',
          400: '#F472B6',
          500: '#EC4899',
          600: '#DB2777',
          700: '#BE185D',
          800: '#9D174D',
          900: '#831843',
        },
        lavender: {
          DEFAULT: '#F5F3FF',
          50: '#FFFFFF',
          100: '#F5F3FF',
          200: '#EDE9FE',
          300: '#DDD6FE',
          400: '#C4B5FD',
          500: '#A78BFA',
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
