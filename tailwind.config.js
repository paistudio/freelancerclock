/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Satoshi', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink:      '#000000',
        canvas:   '#ffffff',
        ash:      '#f5f5f5',
        charcoal: '#171717',
        muted:    '#737373',
        green:    '#a3e635',
        saffron:  '#fef3c8',
        lavender: '#fae9ff',
        mint:     '#d2fae5',
        shadow:   '#0a0a0d',
      },
      borderRadius: {
        btn:  '4px',
        card: '8px',
        lg:   '16px',
        full: '100px',
      },
      boxShadow: {
        hard:   'rgb(10,10,13) 2px 2px 0px 0px',
        hard4:  'rgb(10,10,13) 4px 4px 0px 0px',
        hard1:  'rgb(10,10,13) 1px 1px 0px 0px',
      },
    },
  },
  plugins: [],
}

