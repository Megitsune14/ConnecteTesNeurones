/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          DEFAULT: '#24A1EB',
          hover: '#117DBD',
          light: '#95D1F5',
        },
        lightBlue: '#95D1F5',
        blueHover: '#117DBD',
        darkBlue: '#1A182D',
        darkCyan: '#40E0D0',
        darkRed: '#B22222',
        yellow: {
          DEFAULT: '#F9BB12',
          hover: '#E6A610',
        },
        astro: '#2A233E',
        green: {
          DEFAULT: '#00A19A',
          hover: '#008080',
        },
        grey: '#EBEBEC',
        cyan: '#00FFFF',
        red: {
          DEFAULT: '#DC143C',
          hover: '#B22222',
        },
        whitesmoke: '#F5F5F5',
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.4s ease-out',
      },
      backgroundImage: {
        'gradient-title': 'linear-gradient(135deg, #1A182D 0%, #24A1EB 50%, #00A19A 100%)',
        'gradient-accent': 'linear-gradient(135deg, #24A1EB 0%, #00A19A 100%)',
      },
    },
  },
  plugins: [],
}
