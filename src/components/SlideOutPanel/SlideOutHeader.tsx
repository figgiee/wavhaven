import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline'; // Using Heroicons

interface SlideOutHeaderProps {
  title: string;
  onClose: () => void;
  id?: string; // For aria-labelledby
}

export const SlideOutHeader: React.FC<SlideOutHeaderProps> = ({ title, onClose, id }) => {
  return (
    <div id={id} className="relative flex items-center justify-center p-4 border-b border-gray-700">
      <button
        onClick={onClose}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
        aria-label="Close panel"
      >
        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
      </button>
      <span className="text-lg font-medium truncate text-center px-10" title={title}>
        {title}
      </span>
      {/* Placeholder for potential right-side elements */}
    </div>
  );
}; 