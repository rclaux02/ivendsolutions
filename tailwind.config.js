/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./index.html",
  ],
  theme: {
    extend: {
      fontFamily: {
        akira: ['Akira', 'sans-serif'], // You'll need to add this font
      },
    },
  },
  plugins: [],
}