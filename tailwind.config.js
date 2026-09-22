/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light Minimal Palette
        'neutral': {
          'white': '#FFFFFF',
          'off-white': '#FAFAF8',
          'warm-beige': '#F5F3F0',
          'light-beige': '#E8E6E1',
        },
        'text': {
          'dark': '#2C2C2C',
          'medium': '#5A5A5A',
          'light': '#717171',
        },
        'accent': {
          'brown': '#856E52',
          'green': '#5E7761',
        }
      },
      spacing: {
        'xs': '8px',
        'sm': '16px',
        'md': '24px',
        'lg': '32px',
        'xl': '40px',
      },
      boxShadow: {
        'soft': '0 4px 12px rgba(0,0,0,0.08)',
        'hover': '0 8px 24px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        'minimal': '8px',
      },
      fontFamily: {
        'sans': ['DM Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        'display': ['Cormorant Garamond', 'Georgia', 'serif'],
      }
    }
  },
  plugins: [],
}
