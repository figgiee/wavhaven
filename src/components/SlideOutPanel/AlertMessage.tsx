import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface AlertMessageProps {
  variant?: 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  className?: string;
}

export const AlertMessage: React.FC<AlertMessageProps> = ({
  variant = 'error',
  title,
  message,
  className,
}) => {
  const colors = {
    error: {
      bg: 'bg-red-900/30',
      border: 'border-red-500/50',
      iconColor: 'text-red-400',
      titleColor: 'text-red-300',
      messageColor: 'text-red-400',
      icon: ExclamationTriangleIcon,
    },
    // Add warning/info variants later if needed
  }[variant];

  const Icon = colors.icon;

  return (
    <div
      className={cn(
        'border rounded-md p-4',
        colors.bg,
        colors.border,
        className
      )}
      role="alert"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={cn('h-5 w-5', colors.iconColor)} aria-hidden="true" />
        </div>
        <div className="ml-3">
          {title && (
            <h3 className={cn('text-sm font-medium', colors.titleColor)}>
              {title}
            </h3>
          )}
          <div className={cn('text-sm', title ? 'mt-2' : '', colors.messageColor)}>
            <p>{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}; 