'use client';

import { cn } from '@/lib/utils';
import type { License } from './license.types';

interface LicenseOptionCardProps {
    license: License;
    isSelected: boolean;
    onSelect: () => void;
}

export function LicenseOptionCard({ license, isSelected, onSelect }: LicenseOptionCardProps) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                "w-full p-4 rounded-lg border text-left transition-all duration-200",
                isSelected
                    ? "border-indigo-500 bg-indigo-500/10 shadow-md"
                    : "border-gray-700 hover:border-gray-600 hover:bg-white/5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            )}
            aria-pressed={isSelected} // Indicate selection state for accessibility
        >
            <div className="flex justify-between items-center mb-2">
                <h5 className="font-semibold text-white">{license.name}</h5>
                <span className={cn(
                    "font-semibold text-lg",
                    isSelected ? "text-indigo-400" : "text-white"
                )}>
                    ${license.price.toFixed(2)}
                </span>
            </div>
            <div className="text-xs text-gray-400">
                <p>Includes: {license.includedFiles.join(', ')}</p>
                {/* Optionally add a very short description or key benefit here */}
            </div>
        </button>
    );
} 