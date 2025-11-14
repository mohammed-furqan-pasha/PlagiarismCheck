/**********************************************
 * Tailwind configuration for CopyLess frontend
 **********************************************/

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'academic-green': '#007A5E',
        'input-bg': '#F4F5F7',
        'match-lexical': '#FEE2E2', // light red tint
        'match-semantic': '#ECFEFF', // light cyan/blue tint
      },
    },
  },
  plugins: [],
};
