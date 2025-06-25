import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SlideOutPanel } from './SlideOutPanel';
import { useUIStore } from '@/stores/use-ui-store';
import { usePlayerStore } from '@/stores/use-player-store';
import { useCartStore } from '@/stores/use-cart-store';
import { getBeatDetails, getSimilarTracks } from '@/server-actions/tracks/trackQueries';
import { mockBeatDetailsSuccess, mockSimilarTracks } from '../../../tests/mocks/mockTrackData';
import { Prisma } from '@prisma/client'; // Import Decimal if needed for mock

// --- Mocking ---
vi.mock('@/stores/use-ui-store');
vi.mock('@/stores/use-player-store');
vi.mock('@/stores/use-cart-store');

// CONSOLIDATED MOCK for trackActions - Provides BOTH functions
vi.mock('@/server-actions/trackActions', () => ({
    getBeatDetails: vi.fn(),
    getSimilarTracks: vi.fn(), // <-- Added getSimilarTracks
}));

// Mock LoadingSpinner (Keep if PanelSkeleton isn't mocked)
// Note: PanelSkeleton is used directly now, so this might not be needed
// unless some fallback logic uses it.
vi.mock('@/components/ui/LoadingSpinner', () => ({
    default: () => <div>Loading...</div>
}));

// Mock AlertMessage (Correct)
vi.mock('./AlertMessage', () => ({
    AlertMessage: ({ message, title, variant }: { message: string, title?: string, variant?: string }) => (
        <div data-testid="mock-alert" data-variant={variant || 'default'} data-title={title}>
            Error: {message}
        </div>
    )
}));

// Mock sub-components to isolate SlideOutPanel logic
vi.mock('./SlideOutHeader', () => ({ SlideOutHeader: (props: any) => <div data-testid="mock-header" {...props}>Header - Title: {props.title}</div> }));
vi.mock('./SlideOutBody', () => ({ SlideOutBody: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-body">{children}</div> }));
vi.mock('./BeatOverview/BeatOverviewSection', () => ({ BeatOverviewSection: (props: any) => <div data-testid="mock-overview" {...props}>Overview - Beat ID: {props.beat?.id}</div> }));
vi.mock('./Pricing/PricingSection', () => ({ PricingSection: (props: any) => <div data-testid="mock-pricing" {...props}>Pricing - Beat ID: {props.beat?.id}</div> }));
vi.mock('./SimilarBeats/SimilarBeatsSection', () => ({ SimilarBeatsSection: (props: any) => <div data-testid="mock-similar" {...props}>Similar - Beat ID: {props.beatId}</div> }));

vi.mock('@/lib/api/beats'); // Keep this if needed by SimilarBeatsSection internally

// Define mock data conforming to FullTrackDetails structure from trackActions
// Ensure this structure matches the *actual* return type of your getBeatDetails server action
type FullTrackDetails = import('@/server-actions/trackActions').FullTrackDetails; // Import the type
// Assuming Decimal is imported or handled correctly in the actual type/mock
const mockBeatDetailsData: FullTrackDetails = {
    id: 'beat-123',
    title: 'Test Beat',
    producer: { id: 'prod-1', name: 'Test Producer', _count: { tracks: 1 } },
    genre: 'Trap', // Example: This might be a relation `genres: [{id: ..., name: 'Trap'}]`
    bpm: 140,
    key: 'C Minor',
    artworkUrl: '/test-artwork.jpg',
    audioFileUrl: '/test-audio.mp3',
    waveformUrl: '/test-waveform.json',
    duration: 180,
    price: 30, // Assuming base price, licenses array is primary
    tags: [{ id: 'tag-1', name: 'Dark' }, { id: 'tag-2', name: 'Heavy' }], // Relation
    moods: [{ id: 'mood-1', name: 'Energetic' }], // Relation
    licenses: [
        // Use Prisma.Decimal for price if that's the actual type
        { id: 'lic-1', name: 'Basic', price: new Prisma.Decimal(30.00), description: 'Basic license', trackId: 'beat-123', availableForPurchase: true, fileType: 'MP3' },
        { id: 'lic-2', name: 'Premium', price: new Prisma.Decimal(50.00), description: 'Premium license', trackId: 'beat-123', availableForPurchase: true, fileType: 'WAV' },
    ],
    daw: 'FL Studio',
    description: 'A test beat description.',
    playCount: 100,
    likeCount: 10, // Or use _count.likes
    commentCount: 5, // Or use _count.comments
    repostCount: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    isPublic: true,
    isFeatured: false,
    isLikedByUser: false,
    producerId: 'prod-1',
    _count: { likes: 10, comments: 5 },
    packageDiscountAvailable: true,
    currentUserHasLiked: false,
    url: '/beat/beat-123', // Add if part of type
    isForSale: true, // Add if part of type
    // Add other potential relations/fields based on FullTrackDetails type definition
    // trackFiles: [],
    // orderItems: [],
    // genres: [{ id: 'genre-1', name: 'Trap' }],
};

// Define mock data for similar tracks
// This should match the expected input for SimilarBeatsSection or its data source
const mockSimilarTracksData: any[] = [ // Use the correct type for SimilarTrackCardData if available
    { id: 'sim-1', title: 'Similar Beat 1', producerName: 'Other Prod', artworkUrl: '/sim1.jpg', url: '/beat/sim-1' },
    { id: 'sim-2', title: 'Similar Beat 2', producerName: 'Test Producer', artworkUrl: '/sim2.jpg', url: '/beat/sim-2' },
];

// --- Test Suite ---
describe('SlideOutPanel Integration Tests', () => {
    let mockUseUIStore: Mock;
    let mockUsePlayerStore: Mock;
    let mockUseCartStore: Mock;
    let mockGetBeatDetails: Mock;
    let mockGetSimilarTracks: Mock; // Added mock reference
    let mockCloseSlideOut: Mock;

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mock store state before each test
        mockUseUIStore = vi.mocked(useUIStore);
        mockUsePlayerStore = vi.mocked(usePlayerStore);
        mockUseCartStore = vi.mocked(useCartStore);
        mockCloseSlideOut = vi.fn();

        mockUseUIStore.mockReturnValue({
            isSlideOutOpen: true,
            currentSlideOutBeatId: 'beat-123',
            closeSlideOut: mockCloseSlideOut,
            openSlideOut: vi.fn(),
            // setCurrentSlideOutBeatId: vi.fn(), // Remove if not used directly by component
        });
        mockUsePlayerStore.mockReturnValue({
            isPlaying: false,
            currentTrackId: null,
            volume: 1,
            setVolume: vi.fn(),
            playTrack: vi.fn(),
            pauseTrack: vi.fn(),
            togglePlayPause: vi.fn(),
            setCurrentTrackId: vi.fn(),
            setIsPlaying: vi.fn(),
            currentTrackDetails: null,
            setCurrentTrackDetails: vi.fn(),
        });
        mockUseCartStore.mockReturnValue({
            items: [],
            totalItems: 0,
            addToCart: vi.fn(),
            removeFromCart: vi.fn(),
            clearCart: vi.fn(),
            getCartTotal: vi.fn().mockReturnValue(0),
            getLicenseQuantity: vi.fn().mockReturnValue(0),
            updateLicenseQuantity: vi.fn(),
        });

        // Reset server action mock
        mockGetBeatDetails = vi.mocked(getBeatDetails);
        mockGetSimilarTracks = vi.mocked(getSimilarTracks); // Mock reference

        // Default success state for fetching using local mock data
        mockGetBeatDetails.mockResolvedValue(mockBeatDetailsData); // Use local mock data
        mockGetSimilarTracks.mockResolvedValue(mockSimilarTracksData); // Use local mock data
    });

    // --- Rendering and State Tests ---
    it('should be hidden when isSlideOutOpen is false', () => {
        mockUseUIStore.mockReturnValue({
            isSlideOutOpen: false,
            currentSlideOutBeatId: 'beat-123',
            closeSlideOut: mockCloseSlideOut,
            openSlideOut: vi.fn(),
        });
        render(<SlideOutPanel width="w-96" />);
        const container = screen.getByTestId('slideout-panel-container');

        expect(container).toBeInTheDocument();
        expect(container).toHaveClass('translate-x-full');
        expect(container).not.toHaveClass('translate-x-0');

        expect(screen.queryByText(/Header - Title:/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Overview - Beat ID:/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Pricing - Beat ID:/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Similar - Beat ID:/)).not.toBeInTheDocument();
        expect(screen.queryByTestId('mock-alert')).not.toBeInTheDocument();
    });

    it('should show loading state initially', async () => {
        vi.mocked(getBeatDetails).mockImplementation(() => new Promise(() => {}));
        render(<SlideOutPanel width="w-96" />);

        await waitFor(() => {
            const panelContainer = screen.getByTestId('slideout-panel-container');
            expect(panelContainer.querySelector('.animate-pulse')).toBeInTheDocument();
        });

        expect(screen.queryByTestId('mock-overview')).not.toBeInTheDocument();
        expect(screen.queryByTestId('mock-alert')).not.toBeInTheDocument();
    });

    it('should display error message if getBeatDetails fails', async () => {
        const errorMsg = 'Failed to fetch beat details';
        vi.mocked(getBeatDetails).mockRejectedValue(new Error(errorMsg));
        render(<SlideOutPanel width="w-96" />);

        await waitFor(() => {
            const alert = screen.getByTestId('mock-alert');
            expect(alert).toBeInTheDocument();
            expect(alert).toHaveTextContent(`Error: ${errorMsg}`);
            expect(alert).toHaveAttribute('data-variant', 'error');
        });

        const panelContainer = screen.getByTestId('slideout-panel-container');
        expect(panelContainer.querySelector('.animate-pulse')).not.toBeInTheDocument();
        expect(screen.queryByTestId('mock-overview')).not.toBeInTheDocument();
    });

    it('should display fetched beat data when getBeatDetails succeeds', async () => {
        render(<SlideOutPanel width="w-96" />);

        await waitFor(() => {
            const body = screen.getByTestId('mock-body');
            expect(within(body).getByTestId('mock-overview')).toBeInTheDocument();
            expect(within(body).getByTestId('mock-pricing')).toBeInTheDocument();
            expect(within(body).getByTestId('mock-similar')).toBeInTheDocument();
        });

        const panelContainer = screen.getByTestId('slideout-panel-container');
        expect(panelContainer.querySelector('.animate-pulse')).not.toBeInTheDocument();
        expect(screen.queryByTestId('mock-alert')).not.toBeInTheDocument();

        expect(getBeatDetails).toHaveBeenCalledTimes(1);
        expect(getBeatDetails).toHaveBeenCalledWith('beat-123');

        await waitFor(() => {
            const headerMockProps = vi.mocked(SlideOutHeader).mock.calls[0][0];
            expect(headerMockProps.title).toBe(mockBeatDetailsData.title);

            const similarSectionMockProps = vi.mocked(SimilarBeatsSection).mock.calls[0][0];
            expect(similarSectionMockProps.beatId).toBe(mockBeatDetailsData.id);

            const overviewSectionMockProps = vi.mocked(BeatOverviewSection).mock.calls[0][0];
            expect(overviewSectionMockProps.beat).toEqual(expect.objectContaining({ id: mockBeatDetailsData.id }));

            const pricingSectionMockProps = vi.mocked(PricingSection).mock.calls[0][0];
            expect(pricingSectionMockProps.beat).toEqual(expect.objectContaining({ id: mockBeatDetailsData.id }));
        });
    });

    it('should show info message if beatId is null and panel is open', async () => {
        mockUseUIStore.mockReturnValue({
            isSlideOutOpen: true,
            currentSlideOutBeatId: null,
            closeSlideOut: mockCloseSlideOut,
            openSlideOut: vi.fn(),
        });
        render(<SlideOutPanel width="w-96" />);

        expect(getBeatDetails).not.toHaveBeenCalled();

        await waitFor(() => {
            const alert = screen.getByTestId('mock-alert');
            expect(alert).toBeInTheDocument();
            expect(alert).toHaveTextContent('Error: Please select a beat to view details.');
            expect(alert).toHaveAttribute('data-variant', 'info');
        });

        const panelContainer = screen.getByTestId('slideout-panel-container');
        expect(panelContainer.querySelector('.animate-pulse')).not.toBeInTheDocument();
        expect(screen.queryByTestId('mock-overview')).not.toBeInTheDocument();
    });

    it('should refetch data when beatId changes while open', async () => {
        const { rerender } = render(<SlideOutPanel width="w-96" />);
        await waitFor(() => expect(getBeatDetails).toHaveBeenCalledWith('beat-123'));
        await waitFor(() => expect(screen.getByTestId('mock-header')).toHaveProperty('title', mockBeatDetailsData.title));

        const newBeatId = 'beat-456';
        mockUseUIStore.mockReturnValue({
            isSlideOutOpen: true,
            currentSlideOutBeatId: newBeatId,
            closeSlideOut: mockCloseSlideOut,
            openSlideOut: vi.fn(),
        });
        const newBeatDetailsData = { ...mockBeatDetailsData, id: newBeatId, title: 'New Beat Title' };
        vi.mocked(getBeatDetails).mockResolvedValue(newBeatDetailsData);

        rerender(<SlideOutPanel width="w-96" />);

        await waitFor(() => expect(getBeatDetails).toHaveBeenCalledTimes(2));
        expect(getBeatDetails).toHaveBeenCalledWith(newBeatId);

        await waitFor(() => expect(screen.getByTestId('mock-header')).toHaveProperty('title', 'New Beat Title'));
        await waitFor(() => expect(screen.getByTestId('mock-similar')).toHaveProperty('beatId', newBeatId));
    });

    it('should NOT refetch data if beatId changes but panel is closed', () => {
        render(<SlideOutPanel width="w-96" />);
        expect(getBeatDetails).toHaveBeenCalledTimes(1);

        mockUseUIStore.mockReturnValue({
            isSlideOutOpen: false,
            currentSlideOutBeatId: 'beat-456',
            closeSlideOut: mockCloseSlideOut,
            openSlideOut: vi.fn(),
        });
        const { rerender } = render(<SlideOutPanel width="w-96" />)
        rerender(<SlideOutPanel width="w-96" />);

        expect(getBeatDetails).toHaveBeenCalledTimes(1);
    });

    it('should call closeSlideOut when overlay is clicked', async () => {
        render(<SlideOutPanel width="w-96" />);
        const user = userEvent.setup();

        await waitFor(() => {
            expect(screen.getByTestId('slideout-overlay')).toBeInTheDocument();
        });

        const overlay = screen.getByTestId('slideout-overlay');
        await user.click(overlay);

        expect(mockCloseSlideOut).toHaveBeenCalledTimes(1);
    });

    it('should pass closeSlideOut function to SlideOutHeader', async () => {
        render(<SlideOutPanel width="w-96" />);

        await waitFor(() => {
            expect(vi.mocked(SlideOutHeader)).toHaveBeenCalled();
        });

        const headerMockProps = vi.mocked(SlideOutHeader).mock.calls[0][0];
        expect(headerMockProps.onClose).toBeDefined();
        expect(headerMockProps.onClose).toBe(mockCloseSlideOut);
    });

    // Add tests for focus management and Escape key if needed
}); 
