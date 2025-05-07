import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CartDropdown } from './CartDropdown';
import { useCartStore } from '@/stores/use-cart-store';
import { toast } from 'sonner';

// Mock the Zustand store
vi.mock('@/stores/use-cart-store');

// Mock the toast function
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    // Mock other types if needed (success, error, etc.)
  },
}));

// Mock next/link 
vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode, href: string }) => <a href={href}>{children}</a>
}));

// Mock formatPrice utility (optional, could also import the real one if simple)
vi.mock('@/lib/utils', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...original, // Keep other utils like cn
    formatPrice: (price: number) => `$${price.toFixed(2)}`,
  };
});



describe('CartDropdown', () => {
  // Get a reference to the mocked hook
  const mockUseCartStore = useCartStore as vi.Mock;
  const mockToastInfo = toast.info as vi.Mock;

  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock implementation for useCartStore
    mockUseCartStore.mockImplementation(() => {}); // Default empty implementation
  });

  // Helper function to set up store mock for a specific test
  const setupMockStore = (state: Partial<ReturnType<typeof useCartStore>>) => {
    mockUseCartStore.mockImplementation((selector?: (s: any) => any) => {
      // Simulate selector logic
      if (selector) {
        return selector(state);
      }
      // Return full state if no selector (though CartDropdown uses selectors)
      return state;
    });
  };

  it('should render the cart icon and item count badge', () => {
    // Arrange: Set up store state using the helper
    setupMockStore({
      items: [{ id: '1', licenseId: 'l1', title: 'Test Beat 1', artist: 'Test Artist', price: 10, imageUrl: '', licenseType: 'Basic' }],
      removeItem: vi.fn(),
    });

    // Act
    render(<CartDropdown />);

    // Assert
    expect(screen.getByRole('button', { name: /Open Cart/i })).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); 
  });

  it('should show "Your shopping cart is currently empty" when cart has no items on hover', async () => {
    const user = userEvent.setup();
    setupMockStore({ items: [] });

    render(<CartDropdown />);

    const cartButton = screen.getByRole('button', { name: /open cart/i });

    // Act: Hover over the button
    await user.hover(cartButton);

    // Assert: Wait for the specific text within the dropdown to appear
    const emptyMessage = await screen.findByText(/Your shopping cart is currently empty/i, {}, { timeout: 3000 });
    expect(emptyMessage).toBeInTheDocument();

    // Act: Unhover
    await user.unhover(cartButton);
  });

  const mockItems = [
    { id: 'beat-1', licenseId: 'l1', title: 'Test Beat 1', artist: 'Artist A', price: 19.99, imageUrl: '/img1.jpg', licenseType: 'Basic' },
    { id: 'beat-2', licenseId: 'l2', title: 'Test Beat 2', artist: 'Artist B', price: 29.99, imageUrl: '/img2.jpg', licenseType: 'Premium' },
  ];

  it('should display cart items, total, and checkout button when cart is populated', async () => {
    // Arrange
    const user = userEvent.setup();
    setupMockStore({
      items: mockItems,
      removeItem: vi.fn(),
    });
    render(<CartDropdown />);
    const triggerButton = screen.getByRole('button', { name: /Open Cart/i });

    // Act: Hover
    await user.hover(triggerButton);

    // Assert: Check items, total, etc. (using await findBy* for robustness)
    expect(await screen.findByText('Test Beat 1')).toBeInTheDocument();
    expect(screen.getByText('Artist A - Basic')).toBeInTheDocument();
    expect(screen.getByText('$19.99')).toBeInTheDocument();
    // ... other assertions ...
    expect(screen.getByText('$49.98')).toBeInTheDocument(); 
    expect(screen.getByRole('link', { name: /Proceed to Checkout/i })).toHaveAttribute('href', '/checkout');

  });

  it('should call removeItem and show toast when remove button is clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    const mockRemoveItem = vi.fn();
    setupMockStore({
      items: mockItems,
      removeItem: mockRemoveItem, // Pass the mock function here
    });
    render(<CartDropdown />);
    const triggerButton = screen.getByRole('button', { name: /Open Cart/i });

    // Act: Hover & click remove
    await user.hover(triggerButton);
    const removeButton = await screen.findByRole('button', { name: /Remove Test Beat 1/i });
    await user.click(removeButton);

    // Assert: Check calls
    expect(mockRemoveItem).toHaveBeenCalledTimes(1);
    expect(mockRemoveItem).toHaveBeenCalledWith('l1');
    expect(mockToastInfo).toHaveBeenCalledTimes(1);
    expect(mockToastInfo).toHaveBeenCalledWith('Test Beat 1 removed from cart.');
  });

}); 