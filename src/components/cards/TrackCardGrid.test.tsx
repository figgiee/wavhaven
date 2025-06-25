import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrackCardGrid } from './TrackCardGrid';

// Mock the useTrackCardActions hook
vi.mock('@/hooks/useTrackCardActions', () => ({
  useTrackCardActions: vi.fn(() => ({
    isFavorited: false,
    isOptimisticallyInCart: false,
    isCurrentTrackPlaying: false,
    isThisTrackLoading: false,
    cheapestLicense: { name: 'Basic', price: 29.99 },
    beatPageUrl: '/beat/test-beat',
    producerProfileUrl: '/u/TestProducer',
    handlePlayPauseClick: vi.fn(),
    handleLikeClick: vi.fn(),
    handleAddToCartFromCard: vi.fn(),
    handleCardClick: vi.fn(),
  }))
}));

// Mock Next.js components
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  )
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  )
}));

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => 
    <div className={className} data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, className, ...props }: any) => 
    <div className={className} data-testid="card-content" {...props}>{children}</div>
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, className, onClick, ...props }: any) => 
    <button className={className} onClick={onClick} data-testid="button" {...props}>{children}</button>
}));

// Mock icons
vi.mock('lucide-react', () => ({
  Play: () => <span data-testid="play-icon">▶</span>,
  Pause: () => <span data-testid="pause-icon">⏸</span>,
  Heart: () => <span data-testid="heart-icon">♡</span>,
  ShoppingCart: () => <span data-testid="cart-icon">🛒</span>,
  Loader2: () => <span data-testid="loader-icon">⏳</span>,
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

const mockFullTrackList = [mockBeat];

describe('TrackCardGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render grid layout correctly', () => {
    render(
      <TrackCardGrid
        beat={mockBeat}
        fullTrackList={mockFullTrackList}
        index={0}
      />
    );

    // Card is rendered but doesn't have data-testid, using other identifiers
    expect(screen.getByLabelText('View details for Test Beat')).toBeInTheDocument();
    expect(screen.getByText('Test Beat')).toBeInTheDocument();
    expect(screen.getByText('Test Producer')).toBeInTheDocument();
  });

  it('should render action buttons', () => {
    render(
      <TrackCardGrid
        beat={mockBeat}
        fullTrackList={mockFullTrackList}
        index={0}
      />
    );

    expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
    expect(screen.getByTestId('cart-icon')).toBeInTheDocument();
  });

  it('should render beat image', () => {
    render(
      <TrackCardGrid
        beat={mockBeat}
        fullTrackList={mockFullTrackList}
        index={0}
      />
    );

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', '/test-image.jpg');
    expect(image).toHaveAttribute('alt', 'Cover art for Test Beat');
  });

  it('should display price from cheapest license', () => {
    render(
      <TrackCardGrid
        beat={mockBeat}
        fullTrackList={mockFullTrackList}
        index={0}
      />
    );

    expect(screen.getByText('$29.99')).toBeInTheDocument();
  });

  it('should have proper grid-specific classes', () => {
    render(
      <TrackCardGrid
        beat={mockBeat}
        fullTrackList={mockFullTrackList}
        index={0}
      />
    );

    const card = screen.getByLabelText('View details for Test Beat');
    expect(card).toHaveClass('group');
    expect(card).toHaveClass('cursor-pointer');
  });
}); 