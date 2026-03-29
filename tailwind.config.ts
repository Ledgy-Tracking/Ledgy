import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./index.html",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  corePlugins: {
    preflight: false, // Let the CSS handle base styles
  },
  // Exclude problematic utility classes that cause CSS warnings
  safelist: [
    // Add any classes you want to always include
  ],
  blocklist: [
    // Block problematic patterns that cause CSS warnings
    'file:line',
    '[file:line]',
  ]
};

export default config;