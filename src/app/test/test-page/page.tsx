import React from 'react';

// Minimal page component to test routing within the test layout
export default function TestPage() {
  console.log('[TestPage] Rendering...');
  return (
    <div className="p-4 border border-dashed border-green-500">
      <h1 className="font-bold text-green-600">Minimal Test Page Content</h1>
      <p>If you see this, the test layout and page rendered successfully.</p>
    </div>
  );
} 