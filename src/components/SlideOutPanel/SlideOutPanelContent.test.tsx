import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SlideOutPanelContent } from './SlideOutPanelContent';

// Mock child components
vi.mock('./SlideOutHeader', () => ({
  SlideOutHeader: ({ title }: any) => <div data-testid="mock-header">Header: {title}</div>
}));

vi.mock('./SlideOutBody', () => ({
  SlideOutBody: ({ children }: any) => <div data-testid="mock-body">{children}</div>
}));

vi.mock('./BeatOverview/BeatOverviewSection', () => ({
  BeatOverviewSection: ({ beat }: any) => 
    <div data-testid="mock-overview">Overview: {beat?.title}</div>
}));

vi.mock('./Pricing/PricingSection', () => ({
  PricingSection: ({ beat }: any) => 
    <div data-testid="mock-pricing">Pricing: {beat?.title}</div>
}));

vi.mock('./SimilarBeats/SimilarBeatsSection', () => ({
  SimilarBeatsSection: ({ beatId }: any) => 
    <div data-testid="mock-similar">Similar: {beatId}</div>
}));

vi.mock('./AlertMessage', () => ({
  AlertMessage: ({ message, variant }: any) => 
    <div data-testid="mock-alert" data-variant={variant}>Alert: {message}</div>
}));

// Mock skeleton
const MockPanelSkeleton = () => <div data-testid="panel-skeleton">Loading...</div>;

const mockBeat = {
  id: 'beat-123',
  title: 'Test Beat',
  producerName: 'Test Producer',
  imageUrl: '/test-image.jpg',
  licenses: [
    {
      id: 'license-1',
      name: 'Basic',
      price: 29.99,
      description: 'Basic license',
    },
  ],
};

describe('SlideOutPanelContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should render skeleton when loading', () => {
      render(
        <SlideOutPanelContent
          isLoading={true}
          error={null}
          beat={null}
          similarTracks={[]}
          PanelSkeleton={MockPanelSkeleton}
        />
      );

      expect(screen.getByTestId('panel-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-header')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should render error message when error exists', () => {
      const error = new Error('Failed to load beat');
      
      render(
        <SlideOutPanelContent
          isLoading={false}
          error={error}
          beat={null}
          similarTracks={[]}
          PanelSkeleton={MockPanelSkeleton}
        />
      );

      expect(screen.getByTestId('mock-alert')).toBeInTheDocument();
      expect(screen.getByText('Alert: Failed to load beat')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-overview')).not.toBeInTheDocument();
    });

    it('should render generic error for string error', () => {
      render(
        <SlideOutPanelContent
          isLoading={false}
          error="Something went wrong"
          beat={null}
          similarTracks={[]}
          PanelSkeleton={MockPanelSkeleton}
        />
      );

      expect(screen.getByTestId('mock-alert')).toBeInTheDocument();
      expect(screen.getByText('Alert: Something went wrong')).toBeInTheDocument();
    });
  });

  describe('success state', () => {
    it('should render all content sections when beat data is loaded', () => {
      render(
        <SlideOutPanelContent
          isLoading={false}
          error={null}
          beat={mockBeat}
          similarTracks={[]}
          PanelSkeleton={MockPanelSkeleton}
        />
      );

      // Header
      expect(screen.getByTestId('mock-header')).toBeInTheDocument();
      expect(screen.getByText('Header: Test Beat')).toBeInTheDocument();

      // Body with content sections
      expect(screen.getByTestId('mock-body')).toBeInTheDocument();
      expect(screen.getByTestId('mock-overview')).toBeInTheDocument();
      expect(screen.getByText('Overview: Test Beat')).toBeInTheDocument();
      expect(screen.getByTestId('mock-pricing')).toBeInTheDocument();
      expect(screen.getByText('Pricing: Test Beat')).toBeInTheDocument();
      expect(screen.getByTestId('mock-similar')).toBeInTheDocument();
      expect(screen.getByText('Similar: beat-123')).toBeInTheDocument();
    });

    it('should not render content when beat is null', () => {
      render(
        <SlideOutPanelContent
          isLoading={false}
          error={null}
          beat={null}
          similarTracks={[]}
          PanelSkeleton={MockPanelSkeleton}
        />
      );

      expect(screen.queryByTestId('mock-header')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-overview')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-pricing')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-similar')).not.toBeInTheDocument();
    });
  });

  describe('conditional rendering', () => {
    it('should prioritize loading state over error', () => {
      const error = new Error('Test error');
      
      render(
        <SlideOutPanelContent
          isLoading={true}
          error={error}
          beat={mockBeat}
          similarTracks={[]}
          PanelSkeleton={MockPanelSkeleton}
        />
      );

      expect(screen.getByTestId('panel-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-alert')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-overview')).not.toBeInTheDocument();
    });

    it('should prioritize error state over success', () => {
      const error = new Error('Test error');
      
      render(
        <SlideOutPanelContent
          isLoading={false}
          error={error}
          beat={mockBeat}
          similarTracks={[]}
          PanelSkeleton={MockPanelSkeleton}
        />
      );

      expect(screen.getByTestId('mock-alert')).toBeInTheDocument();
      expect(screen.queryByTestId('panel-skeleton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-overview')).not.toBeInTheDocument();
    });
  });

  describe('props passing', () => {
    it('should pass beat data to child components', () => {
      render(
        <SlideOutPanelContent
          isLoading={false}
          error={null}
          beat={mockBeat}
          similarTracks={[]}
          PanelSkeleton={MockPanelSkeleton}
        />
      );

      expect(screen.getByText('Overview: Test Beat')).toBeInTheDocument();
      expect(screen.getByText('Pricing: Test Beat')).toBeInTheDocument();
      expect(screen.getByText('Similar: beat-123')).toBeInTheDocument();
    });
  });
}); 