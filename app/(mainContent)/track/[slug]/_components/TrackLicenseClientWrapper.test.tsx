import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrackLicenseClientWrapper } from './TrackLicenseClientWrapper';
import { useCartStore } from '@/stores/cartStore'; // Adjust path if needed
import { toast } from 'sonner';
import { License } from '@prisma/client'; // Assuming License type is available
import userEvent from '@testing-library/user-event'; // Import userEvent

// Mock the cart store and toast
vi.mock('@/stores/cartStore', () => ({
    useCartStore: vi.fn()
}));
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    }
}));
// Mock PostHog if used within the component
vi.mock('posthog-js/react', () => ({
    usePostHog: () => ({ capture: vi.fn() })
}));
// Mock useAuth if used
 vi.mock("@clerk/nextjs", () => ({
    useAuth: () => ({ userId: 'test-user-id', isLoaded: true, isSignedIn: true }),
    // Add ClerkProvider mock if needed for layout tests
}));


describe('TrackLicenseClientWrapper', () => {
    // Define mockLicenses with a type that matches expected props
    const mockLicenses: License[] = [
        // Add necessary fields like createdAt, updatedAt, trackId etc. or adjust the type
        { id: 'lic1', type: 'BASIC', price: 29.99, name: 'Basic MP3', description: 'MP3 Lease', trackId: 'track1', createdAt: new Date(), updatedAt: new Date(), isExclusive: false, isMaster: false },
        { id: 'lic2', type: 'PREMIUM', price: 49.99, name: 'Premium WAV', description: 'WAV + MP3 Lease', trackId: 'track1', createdAt: new Date(), updatedAt: new Date(), isExclusive: false, isMaster: false },
    ];
    const mockAddItem = vi.fn();
    const mockRemoveItem = vi.fn(); // Add mocks for other actions if needed
    const mockClearCart = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Explicitly mock the return value of the hook with state and actions
        vi.mocked(useCartStore).mockReturnValue({
            // State properties:
            items: [],
            // Action properties:
            addItem: mockAddItem, // Assign the specific mock function
            removeItem: mockRemoveItem, 
            clearCart: mockClearCart,
            // Add any other state or actions the component might use
        });
    });

    const defaultProps = {
        licenses: mockLicenses,
        trackId: 'track1',
        trackTitle: 'Test Beat',
        producerName: 'Beat Maker',
    };

    it('renders license options correctly', () => {
        render(<TrackLicenseClientWrapper {...defaultProps} />);

        // FIX: Query for the actual rendered text parts
        expect(screen.getByText('BASIC')).toBeInTheDocument();
        expect(screen.getByText('MP3 Lease')).toBeInTheDocument();
        expect(screen.getByText('$29.99')).toBeInTheDocument();

        expect(screen.getByText('PREMIUM')).toBeInTheDocument();
        expect(screen.getByText('WAV + MP3 Lease')).toBeInTheDocument();
        expect(screen.getByText('$49.99')).toBeInTheDocument();

        expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
    });

    it('calls addItem with correct payload when "Add to Cart" is clicked', async () => {
        const user = userEvent.setup(); // Setup userEvent
        render(<TrackLicenseClientWrapper {...defaultProps} />);

        // FIX: Use the correct accessible name and userEvent
        const basicLicenseRadio = screen.getByRole('radio', { name: /BASIC \$29\.99 MP3 Lease/i }); // Escape $ and .
        await user.click(basicLicenseRadio);

        // --> Add assertion: check button is enabled <--
        const addButton = screen.getByRole('button', { name: /add to cart/i });
        expect(addButton).not.toBeDisabled();

        // Click Add to Cart
        await user.click(addButton); // Click the enabled button

        expect(mockAddItem).toHaveBeenCalledTimes(1);
        expect(mockAddItem).toHaveBeenCalledWith({
            id: 'track1-lic1', // Check generated ID format
            trackId: 'track1',
            licenseId: 'lic1',
            name: 'Test Beat',
            licenseType: 'BASIC',
            price: 29.99,
            producer: 'Beat Maker',
            quantity: 1,
             // imageUrl: undefined, // Check if imageUrl is expected
        });
    });

    it('handles empty license array gracefully', () => {
        render(
            <TrackLicenseClientWrapper
                licenses={[]}
                trackId="track1"
                trackTitle="Test Beat"
                producerName="Beat Maker"
            />
        );
        expect(screen.queryByRole('radio')).not.toBeInTheDocument();
        expect(screen.getByText(/No licenses available for this track/i)).toBeInTheDocument();

        // FIX: Assert button is NOT in the document
        expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument();
    });

    // Add tests for default selection, disabled state, etc.
}); 