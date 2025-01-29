/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      spacing: {
        '72p': '72%',
        '49r': '49rem',
        '47r': '47rem',
        '59r': '59rem',
        '54r': '54rem',
        '26r': '26rem',
        '4.5r': '4.5rem',
        '45r': '45rem',
        '42.5r': '42.5rem',
        '40r': '40rem',
        '14.5r': '14.5rem',
        '35r': '35rem',
      },
      /*
      colors: {
        dxp: {
          primary: 'var(--dxp-primary)',
          secondary: 'var(--dxp-secondary)',
          accent: 'var(--dxp-accent)',
          'accent-secondary': 'var(--dxp-accent-secondary)',
          placeholder: 'var(--dxp-placeholder)',
          foreground: 'var(--dxp-foreground)',
          't-primary': 'var(--dxp-t-primary)',
          't-secondary': 'var(--dxp-t-secondary)',
          danger: 'var(--dxp-danger)',
        },
      },
      fontFamily: {
        fontStyle: 'var(--dxp-font)',
      },
      */
    },
  },
  plugins: [],
}
