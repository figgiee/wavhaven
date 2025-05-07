import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BeatActions } from './BeatActions';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { toggleLike } from '@/server-actions/interactionActions';
import { toast } from 'sonner';

// --- Mocking --- 

// Mock Server Actions
vi.mock('@/server-actions/interactionActions', () => ({
    toggleLike: vi.fn(),
}));

// Mock Clerk useAuth
vi.mock('@clerk/nextjs');

// Mock next/navigation
vi.mock('next/navigation');

// Mock Sonner toast
vi.mock('sonner');

// Set up spies for navigator APIs *before* tests run
const mockWriteText = vi.fn().mockResolvedValue(undefined);
const mockShare = vi.fn().mockResolvedValue(undefined);

// Define navigator properties before tests run
Object.defineProperty(global.navigator, 'clipboard', {
    value: { writeText: mockWriteText },
    configurable: true, 
    writable: true 
});
Object.defineProperty(global.navigator, 'share', {
    value: undefined, // Default to undefined (not available)
    configurable: true,
    writable: true
});

// --- Mock Data & Props --- 
const defaultProps = {
    likes: 150,
    commentCount: 25,
    beatId: 'beat-xyz-789',
    title: 'Test Beat Actions Title',
    producerName: 'Test Producer Actions',
    beatUrl: '/beat/beat-xyz-789',
    initialIsLiked: false,
    className: 'test-class',
};

// --- Test Suite --- 

describe('BeatActions Unit Tests', () => {
    let mockUseAuth: Mock;
    let mockUseRouter: Mock;
    let mockPush: Mock;
    let mockToastSuccess: Mock;
    let mockToastError: Mock;
    let mockToggleLike: Mock;

    beforeEach(() => {
        // Reset all mocks
        vi.resetAllMocks();

        // Reset navigator mocks specifically if needed (especially share)
        Object.defineProperty(global.navigator, 'share', { value: undefined, configurable: true });
        mockWriteText.mockClear(); 
        mockShare.mockClear();

        // Setup mock implementations
        mockUseAuth = vi.mocked(useAuth);
        mockUseRouter = vi.mocked(useRouter);
        mockPush = vi.fn();
        mockToastSuccess = vi.mocked(toast.success);
        mockToastError = vi.mocked(toast.error);
        mockToggleLike = vi.mocked(toggleLike);

        // Default mock return values
        mockUseAuth.mockReturnValue({ userId: 'user_test_clerk_id', isSignedIn: true }); // Default to signed in
        mockUseRouter.mockReturnValue({ push: mockPush });
        mockToggleLike.mockResolvedValue({ success: true, isLiked: true, newLikeCount: defaultProps.likes + 1 }); // Default success for like
    });

    // --- Rendering Tests --- 
    it('should render all action buttons', () => {
        render(<BeatActions {...defaultProps} />);
        expect(screen.getByRole('button', { name: /like beat/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add to playlist/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /find similar beats/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /share beat/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /view comments/i })).toBeInTheDocument();
    });

    it('should display initial like and comment counts', () => {
        render(<BeatActions {...defaultProps} />);
        expect(screen.getByText(defaultProps.likes.toString())).toBeInTheDocument();
        expect(screen.getByText(defaultProps.commentCount.toString())).toBeInTheDocument();
    });

    it('should render like button correctly based on initialIsLiked (false)', () => {
        render(<BeatActions {...defaultProps} initialIsLiked={false} />);
        const likeButton = screen.getByRole('button', { name: /like beat/i });
        expect(likeButton).toHaveAttribute('aria-pressed', 'false');
        // Check for outline icon (assuming specific class or structure)
        // expect(likeButton.querySelector('.outline-icon-class')).toBeInTheDocument(); 
    });

    it('should render like button correctly based on initialIsLiked (true)', () => {
        render(<BeatActions {...defaultProps} initialIsLiked={true} />);
        const likeButton = screen.getByRole('button', { name: /unlike beat/i });
        expect(likeButton).toHaveAttribute('aria-pressed', 'true');
         // Check for solid icon (assuming specific class or structure)
        // expect(likeButton.querySelector('.solid-icon-class')).toBeInTheDocument(); 
    });

    // --- Interaction Tests --- 

    // Like Button
    it('should call toggleLike action when like button clicked and user is signed in', async () => {
        const user = userEvent.setup();
        render(<BeatActions {...defaultProps} initialIsLiked={false} />);
        const likeButton = screen.getByRole('button', { name: /like beat/i });

        await user.click(likeButton);

        expect(mockToggleLike).toHaveBeenCalledTimes(1);
        expect(mockToggleLike).toHaveBeenCalledWith(String(defaultProps.beatId));
        // Check for optimistic update (label changes immediately)
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /unlike beat/i })).toBeInTheDocument();
            expect(screen.getByText((defaultProps.likes + 1).toString())).toBeInTheDocument();
        });
    });

    it('should show error and not call toggleLike if user is not signed in', async () => {
        mockUseAuth.mockReturnValue({ userId: null, isSignedIn: false }); // Mock signed out state
        const user = userEvent.setup();
        render(<BeatActions {...defaultProps} />);
        const likeButton = screen.getByRole('button', { name: /like beat/i });

        await user.click(likeButton);

        expect(mockToggleLike).not.toHaveBeenCalled();
        expect(mockToastError).toHaveBeenCalledWith('Please sign in to like beats.');
    });
    
    it('should revert optimistic update and show error if toggleLike fails', async () => {
        const user = userEvent.setup();
        // Mock failure: Use mockRejectedValue for promise rejection
        mockToggleLike.mockRejectedValue(new Error('Simulated Server Error')); 
        // Ensure user is signed in for this test
        vi.mocked(useAuth).mockReturnValue({ isSignedIn: true, userId: 'user-123' });

        render(<BeatActions {...defaultProps} initialIsLiked={false} />); // Start unliked

        const likeButton = screen.getByRole('button', { name: /like beat/i }); // Find initial button
        
        // Initial state check
        expect(likeButton).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByText(defaultProps.likes.toString())).toBeInTheDocument();

        await user.click(likeButton);

        // Optional: Check optimistic state immediately if needed (might be flaky)
        // try {
        //   expect(screen.getByRole('button', { name: /unlike beat/i })).toBeInTheDocument();
        //   expect(screen.getByText((defaultProps.likes + 1).toString())).toBeInTheDocument();
        // } catch (e) {
        //   // Ignore if optimistic update is too fast for RTL to catch before revert
        // }

        // Wait for the promise rejection to be handled and state to revert
        await waitFor(() => {
            // Check it reverted to the original "Like beat" label
            expect(screen.getByRole('button', { name: /like beat/i })).toBeInTheDocument();
            // Check the count reverted
            expect(screen.getByText(defaultProps.likes.toString())).toBeInTheDocument();
        });

        // Check that the error toast was called with the generic message from catch block
        expect(vi.mocked(toast.error)).toHaveBeenCalledWith('An unexpected error occurred.'); 
        // Ensure the action was still called despite failing
        expect(mockToggleLike).toHaveBeenCalledTimes(1); 
    });

    // Find Similar Button
    it('should call router.push with correct URL when find similar button clicked', async () => {
        const user = userEvent.setup();
        render(<BeatActions {...defaultProps} />);
        const findSimilarButton = screen.getByRole('button', { name: /find similar beats/i });
        const expectedUrl = `/search?similarTo=${defaultProps.beatId}&producer=${encodeURIComponent(defaultProps.producerName)}`;

        await user.click(findSimilarButton);

        expect(mockPush).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith(expectedUrl);
    });

    // Share Button (Clipboard Fallback)
    it('should call clipboard.writeText when share button clicked and navigator.share is unavailable', async () => {
        const user = userEvent.setup();
        const expectedUrl = `${window.location.origin}${defaultProps.beatUrl}`;

        // --- Crucial: Mock navigator.share as unavailable for this specific test ---
        Object.defineProperty(global.navigator, 'share', {
            value: undefined, // Make it seem unavailable
            configurable: true, 
            writable: true, 
        });
        // Ensure clipboard mock is also specifically set up for this test scope
        // (although defined globally, redefining here ensures clarity and isolation)
        const localMockWriteText = vi.fn().mockResolvedValue(undefined); 
        Object.defineProperty(global.navigator, 'clipboard', {
            value: { writeText: localMockWriteText },
            configurable: true,
            writable: true,
        });
        // --- End Mocking ---

        render(<BeatActions {...defaultProps} />); // Use defaultProps which now includes title
        const shareButton = screen.getByRole('button', { name: /share beat/i });

        await user.click(shareButton);

        // Assert against the locally defined mock for this test
        expect(localMockWriteText).toHaveBeenCalledTimes(1); 
        expect(localMockWriteText).toHaveBeenCalledWith(expectedUrl);
        expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Beat URL copied to clipboard!');
        expect(mockShare).not.toHaveBeenCalled(); // Verify the global mockShare wasn't called
    });

    // Share Button (Web Share API)
    it('should call navigator.share when available', async () => {
        // Arrange: Mock navigator.share to be available for this test
        Object.defineProperty(global.navigator, 'share', { value: mockShare, configurable: true });
        const user = userEvent.setup();
        render(<BeatActions {...defaultProps} />);
        const shareButton = screen.getByRole('button', { name: /share beat/i });
        const expectedUrl = `${window.location.origin}${defaultProps.beatUrl}`;
        const expectedShareData = {
            title: `Check out this beat: ${defaultProps.title}`, 
            text: expect.stringContaining(defaultProps.producerName),
            url: expectedUrl,
        };

        // Act
        await user.click(shareButton);

        // Assert
        expect(mockShare).toHaveBeenCalledTimes(1); // Assert on the spy
        expect(mockShare).toHaveBeenCalledWith(expect.objectContaining(expectedShareData));
        expect(mockWriteText).not.toHaveBeenCalled(); // Ensure fallback wasn't called
    });

    // TODO: Add tests for AddToPlaylist and Comments click (verify console.log or mock handler calls)

}); 