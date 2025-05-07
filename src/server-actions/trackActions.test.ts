import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma, ContentType } from '@prisma/client';
// Removed Clerk type imports as we mock the return value of auth()
// Import the actual Auth type
import type { AuthObject as Auth } from '@clerk/nextjs/server';

// --- Define the mock structure FIRST ---
const mockPrisma = {
  track: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  // Add other models if needed by other actions
};

// --- Mock Implementations (Return values for auth()) ---
const mockSignedOutAuthResult = {
  userId: null,
  sessionId: null,
  actor: null,
  sessionClaims: null,
  sessionStatus: 'signed_out', // Use correct status string
  organization: null,
  getToken: vi.fn().mockResolvedValue(null),
  // protect: vi.fn(), // Mock protect if used directly
  debug: vi.fn(),
  isPublicRoute: false, // Add potentially missing properties if needed by tests/code
  isApiRoute: false,
  isSignedIn: false,
  // Add other properties returned by auth() if your code uses them
};

const mockSignedInAuthResult = (userId: string) => ({
  userId: userId,
  sessionId: 'sess_mock123',
  actor: null,
  sessionClaims: { /* mock claims if needed */ },
  sessionStatus: 'active', // Use correct status string
  organization: null,
  getToken: vi.fn().mockResolvedValue('mock_token'),
  has: vi.fn().mockResolvedValue(true), // Mock 'has' if used
  // protect: vi.fn(), // Mock protect if used directly
  debug: vi.fn(),
  isPublicRoute: false, // Add potentially missing properties if needed
  isApiRoute: false,
  isSignedIn: true,
  // Add other properties returned by auth() if your code uses them
});


// --- Use vi.doMock referencing the defined structure ---
vi.doMock('@/lib/prisma', () => ({
  prisma: mockPrisma // Use the defined mock object
}));

// --- Mock other dependencies (keep these) ---
vi.doMock('@/lib/userUtils', () => ({
    getInternalUserId: vi.fn().mockResolvedValue('user_internal_default_mock_id'), // Provide a default mock value
}));

vi.doMock('@/lib/posthog-server', () => ({
    posthogServerClient: {
        capture: vi.fn(),
        shutdown: vi.fn(),
        flushAsync: vi.fn().mockResolvedValue(undefined),
    }
}));

// Mock the auth function itself, providing an explicit type signature
vi.doMock('@clerk/nextjs/server', () => ({
    // Explicitly type the mock function to match Clerk's expected signature
    auth: vi.fn<[], Promise<Auth>>(() => 
        Promise.resolve(mockSignedOutAuthResult as unknown as Auth) // Resolve with mock, cast carefully
    ),
}));

vi.doMock('next/navigation', async () => {
   const actual = await vi.importActual('next/navigation');
   return { ...actual, notFound: vi.fn(() => { throw new Error('TEST_NOT_FOUND'); }) };
});

// --- NOW, import the modules under test and dependencies used directly in tests ---
import { getTrackBySlug, searchTracks } from './trackActions';
import { auth } from '@clerk/nextjs/server'; // Import the mocked auth function
import { posthogServerClient } from '@/lib/posthog-server'; // Import mocked posthog client
import { getInternalUserId } from '@/lib/userUtils'; // Import mocked util


// --- Mock Data (Consolidated) ---
const mockTrack = {
    id: 'test-id',
    title: 'Test Track',
    slug: 'test-track',
    isPublished: true,
    producerId: 'prod-1',
    description: 'Test Desc',
    previewAudioUrl: 'url_preview',
    coverImageUrl: 'url_cover',
    bpm: 120,
    key: 'Cmin',
    contentType: ContentType.BEATS,
    tags: ['tag1'],
    createdAt: new Date(),
    updatedAt: new Date(),
    producer: {
        id: 'prod-1',
        name: 'Test Producer',
        username: 'testprod',
        sellerProfile: { storeName: 'Test Store' }
    },
    licenses: [{
        id: 'lic-1',
        trackId: 'test-id',
        type: 'BASIC' as const, // Use const assertion for stricter type
        name: 'Basic',
        // Simulate price potentially being number or Decimal
        price: 29.99, // Use number directly for simplicity in mock
        // price: new Prisma.Decimal(29.99), // Or use Decimal if needed
        description: 'desc',
        createdAt: new Date(),
        updatedAt: new Date(),
    }],
};

const mockTrackList = [mockTrack]; // Example list

// --- Test Suite ---
describe('trackActions', () => {

    // Use the imported mocks - this typing should now be more robust
    const mockedAuth = vi.mocked(auth);
    const mockedPosthogCapture = vi.mocked(posthogServerClient?.capture);
    const mockedGetInternalUserId = vi.mocked(getInternalUserId);

    beforeEach(() => {
      // Reset calls for each mock function before each test
      vi.mocked(mockPrisma.track.findUnique).mockClear();
      vi.mocked(mockPrisma.track.findMany).mockClear();
      mockedAuth.mockClear(); // Should work reliably now
      mockedPosthogCapture?.mockClear(); // Use optional chaining
      mockedGetInternalUserId.mockClear();

      // Reset default mock implementation, casting the resolved value carefully
      mockedAuth.mockImplementation(() => 
          Promise.resolve(mockSignedOutAuthResult as unknown as Auth)
      );
    });

    describe('getTrackBySlug', () => {
        it('should return track details if found and published', async () => {
            // Re-create mock with Decimal price if needed for this specific test
             const mockTrackWithDecimal = {
                 ...mockTrack,
                 licenses: [{ ...mockTrack.licenses[0], price: new Prisma.Decimal(29.99) }]
             };
            vi.mocked(mockPrisma.track.findUnique).mockResolvedValue(mockTrackWithDecimal);

            const result = await getTrackBySlug('test-track');

            expect(mockPrisma.track.findUnique).toHaveBeenCalledTimes(1);
            expect(mockPrisma.track.findUnique).toHaveBeenCalledWith(expect.objectContaining({
                where: { slug: 'test-track', isPublished: true },
                include: expect.any(Object) // Keep flexible or specify exactly
            }));

            expect(result).toBeDefined();
            expect(result?.title).toBe('Test Track');
            expect(result?.producer?.name).toBe('Test Producer');
            // Check if price is Decimal and convert, otherwise access directly
             const price = result?.licenses?.[0]?.price;
             if (typeof price === 'object' && price !== null && typeof (price as any).toFixed === 'function') {
                 expect((price as Prisma.Decimal).toNumber()).toBe(29.99);
             } else {
                 // This branch might not be hit if mock always uses Decimal
                 expect(price).toBe(29.99);
             }
            expect(result?.producer?.sellerProfile?.storeName).toBe('Test Store');
        });

        it('should return null if track is not found', async () => {
            vi.mocked(mockPrisma.track.findUnique).mockResolvedValue(null);
            const result = await getTrackBySlug('non-existent-track');
            expect(mockPrisma.track.findUnique).toHaveBeenCalledTimes(1);
            expect(mockPrisma.track.findUnique).toHaveBeenCalledWith(expect.objectContaining({
                where: { slug: 'non-existent-track', isPublished: true }
            }));
            expect(result).toBeNull();
        });

        it('should return null if track is not published', async () => {
            vi.mocked(mockPrisma.track.findUnique).mockResolvedValue(null); // Prisma returns null if `where` doesn't match
            const result = await getTrackBySlug('unpublished-track');
            expect(mockPrisma.track.findUnique).toHaveBeenCalledTimes(1);
            expect(mockPrisma.track.findUnique).toHaveBeenCalledWith(expect.objectContaining({
                where: { slug: 'unpublished-track', isPublished: true }
            }));
            expect(result).toBeNull();
        });

        it('should handle Prisma errors gracefully (returning null)', async () => {
            vi.mocked(mockPrisma.track.findUnique).mockRejectedValue(new Error('Database connection failed'));
            const result = await getTrackBySlug('any-slug');
            expect(mockPrisma.track.findUnique).toHaveBeenCalledTimes(1);
            expect(result).toBeNull();
            // Optionally check for error logging if implemented
        });
    });

    describe('searchTracks', () => {
        it('should return all published tracks when no query is provided', async () => {
            // Use mock with number price for this test
            vi.mocked(mockPrisma.track.findMany).mockResolvedValue(mockTrackList);

            const results = await searchTracks({});

            expect(results.length).toBe(mockTrackList.length);
            expect(mockPrisma.track.findMany).toHaveBeenCalledTimes(1);

            // !! Ensure this matches the ACTUAL include/select in searchTracks !!
            expect(mockPrisma.track.findMany).toHaveBeenCalledWith({
                where: { isPublished: true },
                include: {
                    licenses: true, // Match the action's include
                    producer: {
                        select: { // Match the action's select
                            id: true,
                            name: true,
                            sellerProfile: {
                                select: {
                                    storeName: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
            expect(results[0].producer?.name).toBe('Test Producer');
            expect(results[0].producer?.sellerProfile?.storeName).toBe('Test Store');
             // Check price (should be number based on mockTrackList)
            expect(results[0].licenses[0].price).toBe(29.99);
        });

         it('should filter tracks by query (title, tags, producer name, store name, description)', async () => {
            const mockFilteredList = [mockTrack]; // Assume filtering returns this
            vi.mocked(mockPrisma.track.findMany).mockResolvedValue(mockFilteredList);
            const searchQuery = 'track 1'; // Example query term

            const results = await searchTracks({ query: searchQuery });

            expect(mockPrisma.track.findMany).toHaveBeenCalledTimes(1);
            // !! Ensure this OR clause matches the ACTUAL implementation !!
            expect(mockPrisma.track.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: {
                    isPublished: true,
                    OR: expect.arrayContaining([
                        expect.objectContaining({ title: { contains: searchQuery, mode: 'insensitive' } }),
                        expect.objectContaining({ producer: { name: { contains: searchQuery, mode: 'insensitive' } } }),
                        expect.objectContaining({ producer: { sellerProfile: { storeName: { contains: searchQuery, mode: 'insensitive' } } } }),
                        expect.objectContaining({ tags: { has: searchQuery } }),
                        expect.objectContaining({ description: { contains: searchQuery, mode: 'insensitive' } })
                    ]),
                },
                // Match include/orderBy as well if specific structure is needed
                include: expect.any(Object), // Or specify exact include
                orderBy: { createdAt: 'desc' }
            }));

            expect(results.length).toBe(mockFilteredList.length);
            expect(results[0].title).toBe('Test Track'); // Check content of filtered result
            // Assert PostHog capture
            expect(mockedPosthogCapture).toHaveBeenCalledTimes(1);
            expect(mockedPosthogCapture).toHaveBeenCalledWith(expect.objectContaining({
                event: 'track_searched',
                properties: expect.objectContaining({ query: searchQuery }) // Check properties
            }));
        });

        it('should handle Prisma errors gracefully (returning empty array)', async () => {
            vi.mocked(mockPrisma.track.findMany).mockRejectedValue(new Error('DB Borked'));
            const results = await searchTracks({});
            expect(mockPrisma.track.findMany).toHaveBeenCalledTimes(1);
            expect(results).toEqual([]);
            // Optionally check for error logging
        });

        it('should capture track_searched event with userType guest when user is not logged in', async () => {
            const searchQuery = 'test query';
            vi.mocked(mockPrisma.track.findMany).mockResolvedValue([]);
            mockedAuth.mockImplementation(() => Promise.resolve({ userId: null })); // Use the result mock

            await searchTracks({ query: searchQuery });

            expect(mockedPosthogCapture).toHaveBeenCalledTimes(1);
            expect(mockedPosthogCapture).toHaveBeenCalledWith(expect.objectContaining({
                event: 'track_searched',
                distinctId: expect.any(String), // Clerk/PostHog should provide anonymous ID
                properties: {
                    query: searchQuery,
                    userType: 'guest',
                    // type: undefined // Or default value
                }
            }));
        });

         it('should capture track_searched event with userType registered and internalId when user is logged in', async () => {
            const searchQuery = 'test query logged in';
            const mockUserId = 'user_clerk_123';
            const mockInternalId = 'user_internal_abc'; // Expected internal ID

            vi.mocked(mockPrisma.track.findMany).mockResolvedValue([]);
            mockedAuth.mockImplementation(() => Promise.resolve({ userId: mockUserId })); // Use the result mock
            mockedGetInternalUserId.mockResolvedValue(mockInternalId); // Ensure mock returns the expected ID

            await searchTracks({ query: searchQuery });

            expect(mockedGetInternalUserId).toHaveBeenCalledWith(mockUserId); // Verify lookup call
            expect(mockedPosthogCapture).toHaveBeenCalledTimes(1);
            expect(mockedPosthogCapture).toHaveBeenCalledWith(expect.objectContaining({
                event: 'track_searched',
                distinctId: mockInternalId, // Use the internal ID
                properties: {
                    query: searchQuery,
                    userType: 'registered',
                    // type: undefined // Or default value
                }
            }));
        });
    });
});

// --- Cleanup Comments ---
// Remove unnecessary comments
