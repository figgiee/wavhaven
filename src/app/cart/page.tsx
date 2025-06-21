import { CartView } from "@/components/features/CartView";
import React from 'react';

export default function CartPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Optional: Add a heading or breadcrumbs specific to the page */}
      {/* <h1 className="text-3xl font-bold mb-6">Shopping Cart</h1> */}
      <CartView />
    </div>
  );
} 