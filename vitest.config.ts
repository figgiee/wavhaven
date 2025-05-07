/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react'; // Required for React component testing
import path from 'path';
import dotenv from 'dotenv'; // Import dotenv
import tsconfigPaths from 'vite-tsconfig-paths'; // Import the plugin

// Load .env file variables into process.env
dotenv.config(); // Assumes .env is in the project root

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(), // Add the plugin here
  ],
  test: {
    globals: true, // Use Vitest global APIs (describe, test, expect)
    environment: 'jsdom', // Simulate browser environment for DOM/component tests
    setupFiles: './src/setupTests.ts', // Add setup file
    // You might want to include files ending in .test.ts or .spec.ts
    include: ['src/**/*.test.{ts,tsx}'],
    // Exclude node_modules, dist, .etc
    exclude: ['node_modules', 'dist', '.next', '.vercel', 'tests/e2e'], 
     // Alias configuration to match tsconfig.json (important!)
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Optional: Add coverage configuration if needed
    // coverage: {
    //   reporter: ['text', 'json', 'html'],
    // },
    // If you have issues with CSS imports in tests:
    // css: true, // or css: { modules: { classNameStrategy: 'non-scoped' } },
  },
}); 