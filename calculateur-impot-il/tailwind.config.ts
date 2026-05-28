import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      borderRadius: {
        card: '12px',
      },
      colors: {
        bituah: '#2563eb', // bleu — cotisations Bituah
        total: '#16a34a', // vert — totaux positifs
        metric: '#7c3aed', // violet — métriques importantes
      },
    },
  },
  plugins: [],
};

export default config;
