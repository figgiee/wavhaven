import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { toast } from 'sonner';

// Define CartItem type properly
export interface CartItem {
    id: string | number; // Track ID
    licenseId: string; // Unique identifier for the cart item (e.g., license_uuid or basic_trackId)
    title: string;
    artist: string;
    price: number;
    imageUrl?: string; 
    trackTitle?: string; // Keep for display consistency if needed
    producerName?: string; // Keep for display consistency if needed
    licenseType?: string; // e.g., 'Basic', 'Premium'
}

interface CartState {
    items: CartItem[];
}

interface CartActions {
    addItem: (item: CartItem) => void;
    removeItem: (licenseId: string) => void; // Action specifically takes licenseId
    clearCart: () => void;
}

const initialState: CartState = {
    items: [],
};

export const useCartStore = create<CartState & CartActions>()(
    devtools(
        persist(
            (set, get) => ({
                ...initialState,

                addItem: (itemToAdd) => {
                    // Ensure the item has a licenseId
                    if (!itemToAdd.licenseId) {
                        console.error('Attempted to add item without a licenseId:', itemToAdd);
                        // Optionally show an error toast to the user
                        toast.error('Could not add item to cart. Missing license information.');
                        return;
                    }

                    const existingItems = get().items;
                    // Prevent adding the exact same licenseId multiple times
                    if (existingItems.some(i => i.licenseId === itemToAdd.licenseId)) {
                        console.warn(`Item with licenseId ${itemToAdd.licenseId} already in cart.`);
                        // Optionally: Show a notification (toast) to the user
                        // toast.error(`${itemToAdd.title} (${itemToAdd.licenseType || 'License'}) is already in your cart.`);
                        return; 
                    }
                    set({ items: [...existingItems, itemToAdd] });
                    console.log('Item added to cart store:', itemToAdd);
                },

                // Remove item specifically by its unique licenseId
                removeItem: (licenseIdToRemove) => {
                    set((state) => ({ 
                        items: state.items.filter(item => item.licenseId !== licenseIdToRemove)
                    }));
                     console.log('Item removed from cart store (licenseId):', licenseIdToRemove);
                },

                clearCart: () => {
                    set({ items: [] });
                    console.log('Cart cleared');
                },
            }),
            {
                name: 'cart-storage', // name of the item in localStorage
            }
        )
    )
);

// Selectors remain the same
export const selectCartCount = (state: CartState) => state.items.length;
export const selectCartTotal = (state: CartState) => 
    state.items.reduce((total, item) => total + item.price, 0); 