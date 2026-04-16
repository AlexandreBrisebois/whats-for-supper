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
        terracotta: {
          DEFAULT: '#CD5D45',
          50: '#F9ECE9',
          100: '#F2D9D4',
          200: '#E6B3A9',
          300: '#D98D7E',
          400: '#CD6753',
          500: '#CD5D45',
          600: '#A44A37',
          700: '#7B3829',
          800: '#52251B',
          900: '#29130E',
        },
        ochre: {
          DEFAULT: '#E1AD01',
          50: '#FFFBE6',
          100: '#FFF7CC',
          200: '#FFEE99',
          300: '#FFE666',
          400: '#FFDD33',
          500: '#E1AD01',
          600: '#B88D01',
          700: '#8F6D01',
          800: '#664E01',
          900: '#3D2F00',
        },
        sage: {
          DEFAULT: '#8A9A5B',
          50: '#F1F3EB',
          100: '#E3E7D7',
          200: '#C7CFB0',
          300: '#ABB789',
          400: '#8F9F62',
          500: '#8A9A5B',
          600: '#6E7A49',
          700: '#525B37',
          800: '#373D25',
          900: '#1B1E12',
        },
        cream: {
          DEFAULT: '#FDFCF0',
          50: '#FFFFFF',
          100: '#FDFCF0',
          200: '#FAF8D1',
          300: '#F7F4B2',
          400: '#F4F093',
          500: '#F1ED74',
        },
        charcoal: {
          DEFAULT: '#1F2937',
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#1F2937',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        glass: '0 4px 30px rgba(0, 0, 0, 0.05)',
        card: '0 2px 16px rgba(45, 49, 46, 0.05)',
      },
    },
  },
  plugins: [forms],
};

export default config;
