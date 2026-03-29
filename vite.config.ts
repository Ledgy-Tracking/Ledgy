/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],

  define: {
    // PouchDB requires 'global' to be defined in the browser
    global: 'window',
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Prevent Vite esbuild from trying to resolve Node.js 'events' polyfills in PouchDB
      // by forcing it to use the pre-built browser distribution
      pouchdb: 'pouchdb/dist/pouchdb.js',
    },
  },

  css: {
    postcss: {},
  },

  build: {
    cssMinify: false, // Temporarily disable to eliminate CSS warning
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', '@radix-ui/react-slot', 'class-variance-authority', 'clsx', 'tailwind-merge'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          db: ['pouchdb'],
          flow: ['@xyflow/react'],
          utils: ['uuid', 'base32-encode', 'base32-decode'],
          // Store chunks to solve dynamic import issue
          stores: ['zustand']
        }
      }
    }
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
        protocol: "ws",
        host,
        port: 1421,
      }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    globals: true,
    include: [
      "src/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "tests/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"
    ],
  },
}));
