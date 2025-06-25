import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTrackCardActions } from './useTrackCardActions';

// Mock stores
vi.mock('@/stores/use-player-store', () => ({
  usePlayerStore: vi.fn(() => ({
    currentTrack: null,
    isPlaying: false,
    isLoading: false,
    togglePlay: vi.fn(),
    playTrackFromList: vi.fn(),
  }))
}));

vi.mock('@/stores/useCartStore', () => ({
  useCartStore: vi.fn(() => ([]))
}));

vi.mock('@/stores/use-ui-store', () => ({
  useUIStore: vi.fn(() => ({
    openSlideOut: vi.fn(),
  }))
}));

vi.mock('posthog-js/react', () => ({
  usePostHog: vi.fn(() => ({
    capture: vi.fn(),
  }))
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }
}));

const mockBeat = {
  id: 'beat-123',
  title: 'Test Beat',
  producerName: 'Test Producer',
  audioSrc: '/test-audio.mp3',
  imageUrl: '/test-image.jpg',
  beatUrl: '/beat/beat-123',
  slug: 'test-beat',
  licenses: [
    {
      id: 'license-1',
      name: 'Basic',
      price: 29.99,
      description: 'Basic license',
    },
  ],
};

describe('useTrackCardActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return hook interface', () => {
    const { result } = renderHook(() =>
      useTrackCardActions({
        beat: mockBeat,
        fullTrackList: [mockBeat],
        index: 0,
      })
    );

    expect(result.current).toBeDefined();
    expect(typeof result.current.handlePlayPauseClick).toBe('function');
    expect(typeof result.current.handleLikeClick).toBe('function');
    expect(typeof result.current.handleAddToCartFromCard).toBe('function');
    expect(typeof result.current.handleCardClick).toBe('function');
  });
}); 