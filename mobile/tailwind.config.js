/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    // Same tokens as the web app's :root variables in src/App.css
    extend: {
      colors: { ink: '#24312e', muted: '#65716b', paper: '#f8f6f0', line: '#d8d8ce', green: '#315b4d', orange: '#e58b54', canvas: '#f3f0e8' },
    },
  },
  plugins: [],
}
