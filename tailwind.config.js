/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#FF5A1F',
        secondary: '#2E8BFF',
        success: '#30D158',
        danger: '#FF453A',
        warning: '#FFD60A',
        dark: '#0A0B0D',
        surface: '#15171C',
        text: '#F2F3F5',
        muted: '#9AA0AB',
        border: '#6B7280',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
};
