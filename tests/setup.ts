import { vi } from 'vitest';
import type { AuthObject } from '@clerk/nextjs/server';

// Mock Prisma Client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    // Explicitly define mocks for used models and methods
    user: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      // Add any other User methods used in tests
    },
    track: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
       // Add any other Track methods used in tests
    },
    license: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      // Add any other License methods used in tests
    },
    order: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        // Add any other Order methods used in tests
    },
     orderItem: {
        createMany: vi.fn(),
        findFirst: vi.fn(),
        // Add any other OrderItem methods used in tests
    },
     trackFile: {
         findUnique: vi.fn(),
         findMany: vi.fn(),
         // Add any other TrackFile methods used in tests
     },
     // Mock $transaction if used directly
     $transaction: vi.fn(async (callback) => {
        // Simple mock: Re-import prisma mock to pass to callback
        const mockPrisma = (await import('@/lib/prisma')).prisma;
        return await callback(mockPrisma);
     }),
    // Add other models used in server actions as needed
  },
}));

// Mock Clerk's auth()
// Define a mock implementation for auth WITH explicit type
const mockAuthImplementation = vi.fn((): AuthObject => ({
  // Provide a default structure matching AuthObject (can be partial)
  userId: null,
  sessionId: null,
  actor: null,
  claims: null,
  getToken: async () => 'mock_token',
  has: () => false,
  isPublicRoute: false, 
  isApiRoute: false,
  // Add other properties if needed by the code under test
}));
vi.mock('@clerk/nextjs/server', async (importOriginal) => {
  const originalModule = await importOriginal<typeof import('@clerk/nextjs/server')>();
  return {
    ...originalModule, // Keep other exports
    // Export the mock implementation directly
    auth: mockAuthImplementation, 
  };
});

// Mock Stripe Client
vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(), // Ensure nested methods are vi.fn()
        // Add retrieve, list, etc. if needed
      },
    },
    webhooks: {
        constructEvent: vi.fn(), // Ensure nested methods are vi.fn()
    }
  },
}));

// Mock lib/storage (Supabase interaction)
vi.mock('@/lib/storage', () => ({
    createSignedUrl: vi.fn(),
    uploadFile: vi.fn(), // If used directly in actions
    getPublicUrl: vi.fn((path: string) => `https://mock-supabase.com/storage/v1/object/public/${path}`),
}));

// Mock lib/userUtils (if it involves DB calls you don't want)
vi.mock('@/lib/userUtils', async (importOriginal) => {
    const original = await importOriginal<typeof import('@/lib/userUtils')>();
    return {
        ...original, // Keep original functions unless mocked
        getInternalUserId: vi.fn(), // Mock the function that likely hits the DB
    };
});

// Mock PostHog Server Client
vi.mock('@/lib/posthog-server', () => ({
    posthogServerClient: {
        capture: vi.fn(),
        // Add other PostHog methods if needed (identify, alias, flush)
        flushAsync: vi.fn(), 
    }
}));

// Mock react-email/render (if sending emails in actions)
vi.mock('@react-email/render', () => ({
    render: vi.fn((component) => `<html>Mock Email Content</html>`)
}));

// Mock your email sending function (e.g., in lib/email)
vi.mock('@/lib/email', () => ({
    sendOrderConfirmationEmail: vi.fn(() => Promise.resolve({ success: true })),
    // Mock other email functions if needed
}));

console.log('Vitest setup file loaded and mocks applied.'); 