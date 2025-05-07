// src/setupTests.ts
// Remove dotenv imports and config call
// import dotenv from 'dotenv';
// import path from 'path'; 
// dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { expect } from 'vitest';
// Correct import for jest-dom matchers
import '@testing-library/jest-dom/vitest';

// Mock ResizeObserver
const ResizeObserverMock = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Assign the mock to the global scope
vi.stubGlobal('ResizeObserver', ResizeObserverMock);

console.log('Vitest setup file loaded and mocks applied.'); 