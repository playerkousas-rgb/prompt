/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070b14',
          900: '#0b1120',
          850: '#101827',
          800: '#16203200',
        },
      },
      keyframes: {
        flash: {
          '0%': { backgroundColor: 'rgba(34,211,238,0.45)' },
          '100%': { backgroundColor: 'rgba(34,211,238,0)' },
        },
      },
      animation: {
        flash: 'flash 1.1s ease-out',
      },
    },
  },
  plugins: [],
};
