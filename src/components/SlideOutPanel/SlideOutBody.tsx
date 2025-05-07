import React from 'react';

interface SlideOutBodyProps {
  children: React.ReactNode;
}

export const SlideOutBody: React.FC<SlideOutBodyProps> = ({ children }) => {
  return (
    <div className="flex-grow overflow-y-auto p-6 space-y-6">
      {children}
    </div>
  );
}; 