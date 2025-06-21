'use client'; // Needs to be client component for hooks and framer-motion

import Link from 'next/link';
import { X, ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/stores/use-cart-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useCallback } from 'react'; // Import useRef and useCallback

export function CartDropdown() {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const itemCount = items.length;
  const [isOpen, setIsOpen] = useState(false);
  // Ref to store the timer ID
  const timerRef = useRef<NodeJS.Timeout | null>(null); 

  const handleRemoveItem = (licenseId: string, title: string) => {
    removeItem(licenseId);
    toast.info(`${title} removed from cart.`);
  };

  const total = items.reduce((acc, item) => acc + item.price, 0);

  // Animation variants
  const dropdownVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: -10,
      transition: { duration: 0.2, ease: 'easeOut' },
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.2, ease: 'easeIn' },
    },
  };

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearTimer(); // Clear any pending close timer
    setIsOpen(true);
  }, [clearTimer]);

  const handleMouseLeave = useCallback(() => {
    // Start a timer to close the menu after a short delay
    timerRef.current = setTimeout(closeMenu, 200); // 200ms delay
  }, [closeMenu]);

  return (
    // Wrapper div - mouse enter here clears timer and opens
    // Mouse leave here starts the close timer
    <div 
      className="relative inline-block" 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Button */}
      <Button variant="ghost" size="icon" className="relative rounded-full">
        <ShoppingCart className="h-5 w-5 text-gray-400 group-hover:text-white" />
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            {itemCount}
          </span>
        )}
        <span className="sr-only">Open Cart</span>
      </Button>

      {/* Animated Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="cart-content" 
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={dropdownVariants}
            className="absolute top-full right-0 mt-2 w-80 rounded-xl border border-white/10 bg-gradient-to-br from-black/80 to-gray-900/80 p-0 text-white shadow-xl backdrop-blur-lg z-50 outline-none overflow-hidden"
            // Mouse enter on the panel itself also clears the close timer
            onMouseEnter={handleMouseEnter} 
            // Mouse leave from the panel restarts the close timer
            onMouseLeave={handleMouseLeave} 
          >
            {/* Actual Content - Structure remains the same */}
            {itemCount === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                <ShoppingCart className="h-10 w-10 text-gray-500" strokeWidth={1.5} />
                <p className="text-sm text-gray-300">
                  Your shopping cart is currently empty.
                </p>
                <Button 
                  variant="link"
                  size="sm"
                  className="text-indigo-400 hover:text-indigo-300 h-auto p-0 text-sm"
                  asChild
                >
                   <Link href="/explore">Start Browsing</Link>
                 </Button>
              </div>
            ) : (
              <>
                <div className="p-4 pb-2">
                  <h3 className="text-lg font-semibold">Shopping Cart</h3>
                </div>
                <ScrollArea className="h-[250px] px-4">
                  <div className="flex flex-col gap-3 py-2 pr-2">
                    {items.map((item) => (
                      <div key={item.licenseId} className="flex items-center gap-3 group">
                        <Avatar className="h-12 w-12 rounded border border-white/10 flex-shrink-0">
                          <AvatarImage src={item.imageUrl} alt={item.title} className="object-cover" />
                          <AvatarFallback className="bg-gray-700 text-white">
                            {item.title?.charAt(0)?.toUpperCase() ?? ' '}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                           <Link href={`/beats/${item.id}`} className="block group/link">
                            <p className="truncate font-medium text-sm hover:text-indigo-400 transition-colors">{item.title}</p>
                          </Link>
                          <p className="text-xs text-gray-400 truncate">{item.artist} - {item.licenseType}</p>
                          <p className="text-sm font-semibold text-indigo-400">{formatPrice(item.price)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={() => handleRemoveItem(item.licenseId, item.title)}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Remove {item.title}</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="border-t border-white/10 p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-base font-medium">Total</span>
                    <span className="text-lg font-semibold text-indigo-300">{formatPrice(total)}</span>
                  </div>
                  <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Link href="/checkout">Proceed to Checkout</Link>
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 