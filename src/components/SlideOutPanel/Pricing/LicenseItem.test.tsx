import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LicenseItem } from './LicenseItem';
import type { License } from '@/types';

// Mock the formatPrice utility function
// If it's complex, mock the module; otherwise, provide a simple implementation
vi.mock('@/lib/utils', async (importOriginal) => {
    const original = await importOriginal<typeof import('@/lib/utils')>();
    return {
        ...original, // Keep other utils if needed
        formatPrice: vi.fn((price: number) => `$${price.toFixed(2)}`), // Simple mock implementation
    };
});

// Mock data for a license
const mockLicense: License = {
    id: 'lic-premium-123',
    name: 'Premium License',
    price: 49.99,
    description: 'WAV + MP3 files included.',
};

describe('LicenseItem Unit Tests', () => {
    let mockOnAddToCart: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        // Reset mocks before each test
        vi.resetAllMocks();
        // Create a fresh mock function for the handler each time
        mockOnAddToCart = vi.fn();
    });

    it('should render license details correctly', () => {
        // Arrange
        render(<LicenseItem license={mockLicense} onAddToCart={mockOnAddToCart} />);

        // Assert
        // Check name
        expect(screen.getByText(mockLicense.name)).toBeInTheDocument();
        // Check description
        expect(screen.getByText(mockLicense.description)).toBeInTheDocument();
        // Check formatted price (using the mock format)
        expect(screen.getByText(`$${mockLicense.price.toFixed(2)}`)).toBeInTheDocument();
        // Check button aria-label contains relevant info
        expect(screen.getByRole('button', { name: /add premium license to cart/i })).toBeInTheDocument();
    });

    it('should call onAddToCart with the correct license ID when button is clicked', async () => {
        // Arrange
        const user = userEvent.setup();
        render(<LicenseItem license={mockLicense} onAddToCart={mockOnAddToCart} />);
        const addButton = screen.getByRole('button', { name: /add premium license to cart/i });

        // Act
        await user.click(addButton);

        // Assert
        expect(mockOnAddToCart).toHaveBeenCalledTimes(1);
        expect(mockOnAddToCart).toHaveBeenCalledWith(mockLicense.id);
    });
}); 