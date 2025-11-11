/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx,html}',
  ],
  theme: {
    extend: {
      colors: {
        'memopyk-navy': '#011526',
        'memopyk-dark-blue': '#2A4759',
        'memopyk-sky-blue': '#89BAD9',
        'memopyk-blue-gray': '#8D9FA6',
        'memopyk-cream': '#F2EBDC',
        'memopyk-orange': '#D67C4A',
      },
      fontFamily: {
        sans: ['"Work Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
