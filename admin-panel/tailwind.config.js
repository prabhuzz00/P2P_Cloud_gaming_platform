/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gaming: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        accent: {
          cyan: '#22d3ee',
          violet: '#8b5cf6',
          emerald: '#34d399',
          rose: '#fb7185',
          amber: '#fbbf24',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(99, 102, 241, 0.15), 0 20px 40px rgba(15, 23, 42, 0.45)',
      },
      backgroundImage: {
        panel: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.14), transparent 30%), linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(2, 6, 23, 1))',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
