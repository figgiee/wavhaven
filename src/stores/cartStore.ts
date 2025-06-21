import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { toast } from 'sonner'; // Assuming sonner is used for toasts as per Step 1.7 & 4.3

// Define the structure of an item in the cart
export interface CartItem {
  licenseId: string;
  trackId: string;
  trackTitle: string;
  producerName: string;
  price: number;
  licenseType: string; // e.g., 'Basic', 'Premium', 'Exclusive'
  imageUrl?: string; // Optional image URL for the track
}

// Define the state structure for the cart store
interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (licenseId: string) => void;
  clearCart: () => void;
}

// Create the Zustand store with persistence
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      // Action to add an item to the cart
      addItem: (item) => {
        const existingItem = get().items.find(
          (cartItem) => cartItem.licenseId === item.licenseId
        );

        if (existingItem) {
          // Optional: Show a message or prevent adding duplicates
          // For now, we'll prevent adding the exact same license again
          console.warn(`Item with license ID ${item.licenseId} already in cart.`);
          toast.info(`"${item.trackTitle} - ${item.licenseType}" is already in your cart.`);
          return;
        }

        set((state) => ({
          items: [...state.items, item],
        }));
        toast.success(`"${item.trackTitle} - ${item.licenseType}" added to cart.`);
      },

      // Action to remove an item from the cart by license ID
      removeItem: (licenseId) => {
        set((state) => ({
          items: state.items.filter((item) => item.licenseId !== licenseId),
        }));
        toast.info("Item removed from cart.");
      },

      // Action to clear all items from the cart
      clearCart: () => {
        set({ items: [] });
        toast.info("Cart cleared.");
      },
    }),
    {
      name: 'wavhaven-cart-storage', // Unique name for localStorage key
      storage: createJSONStorage(() => localStorage), // Use localStorage for persistence
    }
  )
);

// Example usage (can be removed, just for illustration):
// const addItemToCart = useCartStore.getState().addItem;
// const cartItems = useCartStore((state) => state.items); 