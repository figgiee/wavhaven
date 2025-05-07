import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to format time in seconds to MM:SS format
export function formatTime(seconds: number): string {
  if (Number.isNaN(seconds) || seconds < 0) {
    return '0:00'; // Return default value for invalid input
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const formattedSeconds = remainingSeconds.toString().padStart(2, '0');
  return `${minutes}:${formattedSeconds}`;
}

// Added formatDuration function (same as formatTime for now)
export function formatDuration(seconds: number): string {
  if (Number.isNaN(seconds) || seconds < 0) {
    return '0:00'; // Return default value for invalid input
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const formattedSeconds = remainingSeconds.toString().padStart(2, '0');
  return `${minutes}:${formattedSeconds}`;
}

// Function to format currency (example - adjust locale/currency as needed)
export function formatPrice(amount: number | null | undefined, currency: string = 'USD', locale: string = 'en-US'): string {
    // Handle null/undefined/NaN inputs gracefully
    if (amount === null || amount === undefined || Number.isNaN(amount)) {
        return '$0.00'; // Return a default formatted price
    }
    // Assumes amount is in dollars/main currency unit already
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
    }).format(amount);
}

// DEPRECATED: formatCurrency assumed cents, using formatPrice now.
// export function formatCurrency(amount: number | null | undefined, currency: string = 'USD', locale: string = 'en-US'): string {
//     // Handle null/undefined/NaN inputs gracefully
//     if (amount === null || amount === undefined || isNaN(amount)) {
//         return 'N/A'; // Or return $0.00 or handle as appropriate
//     }
//     // Note: Assumes amount is in cents, divide by 100 for currency format
//     return new Intl.NumberFormat(locale, {
//         style: 'currency',
//         currency: currency,
//         minimumFractionDigits: 2,
//     }).format(amount / 100); // Divide by 100 if input is in cents
// }
