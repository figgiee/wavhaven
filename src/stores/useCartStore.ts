import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { toast } from 'sonner'; // Assuming sonner is used for toasts

export interface CartItem {
  trackId: string;
  licenseId: string;
  trackTitle: string;
  producerName: string;
  imageUrl?: string; // Optional image URL
  licenseName: string; // e.g., "Basic License"
  price: number; // Store price in cents or smallest unit
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (trackId: string, licenseId: string) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const currentItems = get().items;
        // Check if the *specific license* for this track is already in the cart
        const existingItemIndex = currentItems.findIndex(
          (cartItem) =>
            cartItem.trackId === item.trackId &&
            cartItem.licenseId === item.licenseId
        );

        if (existingItemIndex > -1) {
          // Item with this specific license already exists
          toast.info(`${item.trackTitle} (${item.licenseName}) is already in your cart.`);
          return; // Don't add duplicates of the same license for the same track
        }

        // Check if *any license* for this track is already in the cart
        // You might only allow one license type per track in the cart at a time
        const trackAlreadyInCart = currentItems.some(
          (cartItem) => cartItem.trackId === item.trackId
        );

        if (trackAlreadyInCart) {
          // Optionally replace the existing license or show a message
          toast.warning(
            `You already have a license for ${item.trackTitle} in your cart. Adding the ${item.licenseName}.`,
            {
                description: "Consider removing the other license if you only need one.",
                // action: { // Maybe add an action later to replace
                //   label: "Replace",
                //   onClick: () => { /* replace logic */ },
                // },
            }
          );
           // For now, just add the new one alongside the old one.
           // If replacement is desired, filter out the old one here.
          set((state) => ({ items: [...state.items, item] }));
          toast.success(`${item.trackTitle} (${item.licenseName}) added to cart.`);

        } else {
           // Add the new item
           set((state) => ({ items: [...state.items, item] }));
           toast.success(`${item.trackTitle} (${item.licenseName}) added to cart.`);
        }


      },

      removeItem: (trackId, licenseId) => {
        const items = get().items;
        // Find the item being removed to get its title for the toast
        const itemToRemove = items.find(
          (item) => item.trackId === trackId && item.licenseId === licenseId
        );

        // Filter out the item
        const updatedItems = items.filter(
          (item) => !(item.trackId === trackId && item.licenseId === licenseId)
        );

        set({ items: updatedItems });

        // Show a specific toast message
        if (itemToRemove) {
          toast.success(`${itemToRemove.trackTitle} (${itemToRemove.licenseName}) removed from cart.`);
        } else {
          // Fallback message if item wasn't found (shouldn't normally happen)
          toast.success("Item removed from cart."); 
        }
      },

      clearCart: () => {
        set({ items: [] });
        toast.info("Cart cleared.");
      },

      getItemCount: () => {
        return get().items.length;
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + item.price, 0);
      },
    }),
    {
      name: 'cart-storage', // unique name for localStorage key
      storage: createJSONStorage(() => localStorage), // use localStorage
    }
  )
); 