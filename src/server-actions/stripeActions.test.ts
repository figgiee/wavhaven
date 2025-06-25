import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/webhooks/stripe/route';
import { headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { stripeClient } from '@/lib/payments/stripe'; // Import without renaming
// Remove direct prisma import, it's likely mocked or implicitly available
// import prisma from '@/lib/prisma'; 
import { Prisma } from '@prisma/client';
import Stripe from 'stripe'; // Keep Stripe type import if needed
// Remove direct stripe import if stripeClient is used
// import Stripe from 'stripe';

// Import the action to test
import { createCheckoutSession } from './stripeActions';

// Import mocks (ensure paths match your setup)
import { prisma } from '@/lib/db/prisma';
import { stripe } from '@/lib/payments/stripe';
// Import the module itself, not the specific mock implementation
import * as ClerkServer from '@clerk/nextjs/server'; 
import { getInternalUserId } from '@/lib/userUtils';
import { posthogServerClient } from '@/lib/posthog-server';
import { LicenseType } from '@prisma/client'; // <-- Import the enum
// import type { AuthObject } from '@clerk/nextjs/server'; // Removed type import

// Type definition for input matching the action
type CreateCheckoutSessionInput = Parameters<typeof createCheckoutSession>[0];

// --- Vitest Mocks ---
// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), upsert: vi.fn() },
    license: { findMany: vi.fn() },
    // Mock other models/methods if needed
  },
}));

// Mock Stripe
vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: { create: vi.fn() },
    },
    // Mock other stripe methods if needed
  },
}));

// Mock Clerk auth function
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(), // Mock the auth function itself
}));

// Mock other utils
vi.mock('@/lib/userUtils');
vi.mock('@/lib/posthog-server', () => ({ 
  posthogServerClient: { capture: vi.fn() }
}));

// Define minimal mock types for complex return values
interface MockPrismaLicense {
    id: string;
    price: number;
    type: LicenseType; // <-- Use the imported enum
    trackId: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    track: { title: string };
}

interface MockStripeSession {
    id: string;
    url: string | null;
}

describe('stripeActions - createCheckoutSession', () => {
  // Get typed references to mocks
  const mockAuth = vi.mocked(ClerkServer.auth);
  const mockGetInternalUserId = vi.mocked(getInternalUserId);
  const mockPrismaUserFindUnique = vi.mocked(prisma.user.findUnique);
  const mockPrismaUserUpsert = vi.mocked(prisma.user.upsert);
  const mockPrismaLicenseFindMany = vi.mocked(prisma.license.findMany);
  const mockStripeSessionCreate = vi.mocked(stripe.checkout.sessions.create);
  const mockPosthogCapture = vi.mocked(posthogServerClient.capture);

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset specific mocks if needed
    vi.mocked(prisma.license.findMany).mockReset();
    vi.mocked(getInternalUserId).mockReset();
    vi.mocked(stripe.checkout.sessions.create).mockReset();
    // Default mock implementations - use the mock directly
    mockAuth.mockReturnValue({ userId: null }); // Use mock directly
    mockGetInternalUserId.mockResolvedValue('internal_usr_123');
    // ... other default mock implementations ...
    // Use numbers for price in default mock data
    mockPrismaLicenseFindMany.mockResolvedValue([
        { id: 'lic_abc', price: 10, type: LicenseType.BASIC, trackId: 'trk_1', name:'Basic', description: '', createdAt: new Date(), updatedAt: new Date(), track: { title: 'Test Track 1' } },
        { id: 'lic_def', price: 20, type: LicenseType.PREMIUM, trackId: 'trk_2', name:'Premium', description: '', createdAt: new Date(), updatedAt: new Date(), track: { title: 'Test Track 2' } },
    ] as MockPrismaLicense[]); 
    mockStripeSessionCreate.mockResolvedValue({
      id: 'cs_test_12345',
      url: 'https://checkout.stripe.com/mock_session',
    } as MockStripeSession);
  });

  // Test case: Successful checkout for a registered user
  it('should create a checkout session successfully for a registered user', async () => {
    // Arrange: Simulate logged-in user
    const clerkUserId = 'user_clerk_12345';
    // Use mock directly
    mockAuth.mockReturnValue({ 
        userId: clerkUserId, 
        sessionId: 'sess_mock123', actor: null, claims: null, getToken: async () => 'mock_token', has: () => false, isPublicRoute: false, isApiRoute: false,
    }); 
    const internalUserId = 'internal_usr_123';
    mockGetInternalUserId.mockResolvedValue(internalUserId);
    
    const validLicenseId = '123e4567-e89b-12d3-a456-426614174000'; // Use a UUID format

    // Use vi.mocked() for mockResolvedValueOnce
    vi.mocked(prisma.license.findMany).mockResolvedValueOnce([
        // Use number for price
        { id: validLicenseId, price: 10, type: LicenseType.BASIC, trackId: 'trk_1', name:'Basic', description: '', createdAt: new Date(), updatedAt: new Date(), track: { title: 'Test Track 1' } },
    ] as MockPrismaLicense[]); // Use defined type

    const input: CreateCheckoutSessionInput = {
      items: [{ licenseId: validLicenseId }], 
      // No guestEmail needed for registered user
    };

    // Act: Call the action
    const result = await createCheckoutSession(input);

    // Assert: Check results and mock calls
    if (!result.success) {
        console.error('Test failed unexpectedly with error from action:', result.error);
    }
    expect(result.success).toBe(true);
    expect(mockGetInternalUserId).toHaveBeenCalledWith(clerkUserId); // Verify this is called
    
    if (result.success) {
      expect(result.url).toBe('https://checkout.stripe.com/mock_session');
    }

    // Check mock calls using vi.mocked() for consistency
    expect(mockPrismaUserFindUnique).toHaveBeenCalledWith({ 
        where: { id: internalUserId }, 
        select: { email: true }
    }); 
    expect(mockPrismaUserUpsert).not.toHaveBeenCalled(); 
    expect(mockPrismaLicenseFindMany).toHaveBeenCalledWith({
      where: { id: { in: [validLicenseId] } }, 
      select: { 
        id: true, 
        price: true, 
        type: true, 
        track: { select: { title: true }}
      },
    });
    expect(mockStripeSessionCreate).toHaveBeenCalledWith({
      payment_method_types: ['card'],
      line_items: expect.arrayContaining([
        // Corrected price calculation (10 * 100)
        expect.objectContaining({ price_data: expect.objectContaining({ unit_amount: 1000, currency: 'usd', product_data: expect.objectContaining({name: 'Test Track 1 - BASIC License'}) }) , quantity: 1})
      ]),
      mode: 'payment',
      success_url: expect.stringContaining('/order/success?session_id={CHECKOUT_SESSION_ID}'),
      cancel_url: expect.stringContaining('/cart'),
      client_reference_id: internalUserId,
      customer_email: undefined, 
      metadata: {
        licenseIds: JSON.stringify([validLicenseId]),
        internalUserId: internalUserId,
      },
    });
    expect(mockPosthogCapture).toHaveBeenCalledWith({
        distinctId: internalUserId,
        event: 'checkout_started',
        properties: expect.objectContaining({
            userType: 'registered',
            itemCount: 1,
            totalAmount: 10, // Use number 
            licenseIds: [validLicenseId],
        }),
    });

  });

  // --- Add more test cases here based on Step 5.3 details ---
  // - Guest checkout success
  // - License not found error
  // - Stripe API error
  // - Invalid input (handled by Zod before action? Test Zod schema separately if needed)

  it('should return success: false if user is not found', async () => {
    // ... test implementation ...
  });

  it('should return success: false if rate limit exceeded', async () => {
    // ... test implementation ...
  });

  it('should return success: false if license lookup fails (DB Error)', async () => {
    const clerkUserId = 'user_clerk_db_error';
    mockAuth.mockReturnValue({ userId: clerkUserId });
    mockGetInternalUserId.mockResolvedValue('internal_usr_db_error');
    
    // Mock findMany to throw a specific database error AFTER validation passes
    const dbError = new Error('Database connection failed');
    mockPrismaLicenseFindMany.mockRejectedValue(dbError);

    const validLicenseId = 'valid-uuid-format-1234567890ab'; // Use a valid format

    const input: CreateCheckoutSessionInput = {
        items: [{ licenseId: validLicenseId }],
        // No guestEmail for registered user
    };

    const result = await createCheckoutSession(input);

    expect(result.success).toBe(false);
    // Expect the generic error message from the catch block, wrapping the DB error
    expect(result.error).toContain('Checkout failed: Database connection failed'); 
    expect(mockPrismaLicenseFindMany).toHaveBeenCalled(); // Ensure DB was actually queried
  });

  it('should return success: false if Zod validation fails (e.g., invalid License ID format)', async () => {
      const clerkUserId = 'user_clerk_validation_fail';
      mockAuth.mockReturnValue({ userId: clerkUserId });
      mockGetInternalUserId.mockResolvedValue('internal_usr_validation_fail');

      const input: CreateCheckoutSessionInput = {
          items: [{ licenseId: 'invalid-id-format' }], // Invalid format
      };

      const result = await createCheckoutSession(input);

      expect(result.success).toBe(false);
      // Expect the Zod validation error message 
      expect(result.error).toContain('Invalid uuid'); // Default Zod UUID error message
      expect(mockPrismaLicenseFindMany).not.toHaveBeenCalled(); // Ensure DB wasn't queried
  });

  it('should return success: false if some licenses are not found', async () => {
    const clerkUserId = 'user_clerk_not_found';
    mockAuth.mockReturnValue({ userId: clerkUserId });
    mockGetInternalUserId.mockResolvedValue('internal_usr_not_found');

    // Simulate returning fewer licenses than requested
    const mockLicenses = [
        // Use number for price
        { id: 'lic1-valid-uuid', price: 30, type: LicenseType.BASIC, trackId: 't1', name: 'Basic', description: '', createdAt: new Date(), updatedAt: new Date(), track: { title: 'Track 1' } },
    ];
    // Ensure correct typing
    vi.mocked(prisma.license.findMany).mockResolvedValue(mockLicenses as MockPrismaLicense[]); 

    const input: CreateCheckoutSessionInput = {
        items: [
            { licenseId: 'lic1-valid-uuid' }, // This one will be found
            { licenseId: 'lic-not-found-valid-uuid' } // This one won't be in the mock response
        ],
    };

    const result = await createCheckoutSession(input);

    expect(result.success).toBe(false);
    // Expect the specific error message from the action when lengths mismatch
    expect(result.error).toContain('One or more items in your cart are invalid. Please refresh and try again.'); 
    expect(mockPrismaLicenseFindMany).toHaveBeenCalled(); 
  });

  // Renamed the original test for clarity, keeping its logic
  it('should create a checkout session successfully with multiple valid items', async () => {
    const clerkUserId = 'user-clerk-multi-item';
    mockAuth.mockReturnValue({ userId: clerkUserId });
    const internalUserId = 'internal-multi-item';
    mockGetInternalUserId.mockResolvedValue(internalUserId);
    
    const mockSessionId = 'cs_test_multi';
    const mockSessionUrl = 'https://checkout.stripe.com/pay/cs_test_multi';

    // Mock prisma.license.findMany to return valid licenses matching input
    const mockLicenses = [
        { id: 'lic1-multi-uuid', price: 30, type: LicenseType.BASIC, trackId: 't1', name: 'Basic', description: '', createdAt: new Date(), updatedAt: new Date(), track: { title: 'Track 1' } },
        { id: 'lic2-multi-uuid', price: 50, type: LicenseType.PREMIUM, trackId: 't2', name: 'Premium', description: '', createdAt: new Date(), updatedAt: new Date(), track: { title: 'Track 2' } },
    ];
    vi.mocked(prisma.license.findMany).mockResolvedValue(mockLicenses as MockPrismaLicense[]);

    // Mock Stripe session creation
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: mockSessionId,
        url: mockSessionUrl,
    } as MockStripeSession);

    const input: CreateCheckoutSessionInput = {
      items: [{ licenseId: 'lic1-multi-uuid' }, { licenseId: 'lic2-multi-uuid' }],
    };

    const result = await createCheckoutSession(input);

    expect(result.success).toBe(true);
    if(result.success) {
        expect(result.url).toBe(mockSessionUrl);
    }
    expect(mockGetInternalUserId).toHaveBeenCalledWith(clerkUserId); // Ensure this was called
    expect(mockPrismaLicenseFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: ['lic1-multi-uuid', 'lic2-multi-uuid'] } },
    }));
    expect(mockStripeSessionCreate).toHaveBeenCalledWith(expect.objectContaining({
      line_items: expect.arrayContaining([
        expect.objectContaining({ price_data: expect.objectContaining({ unit_amount: 3000 }) }), // 30 * 100
        expect.objectContaining({ price_data: expect.objectContaining({ unit_amount: 5000 }) })  // 50 * 100
      ]),
      client_reference_id: internalUserId,
      metadata: expect.objectContaining({ licenseIds: JSON.stringify(['lic1-multi-uuid', 'lic2-multi-uuid']) }),
    }));
    expect(mockPosthogCapture).toHaveBeenCalledWith(expect.objectContaining({
        distinctId: internalUserId,
        event: 'checkout_started',
        properties: expect.objectContaining({ totalAmount: 80 }), // 30 + 50
    }));
  });

  // Add more tests: e.g., Stripe API errors
}); 