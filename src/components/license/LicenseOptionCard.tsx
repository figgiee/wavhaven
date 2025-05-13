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
                    ? "border-cyan-glow bg-cyan-glow/10 shadow-glow-cyan-sm text-cyan-glow"
                    : "border-neutral-700 hover:border-cyan-glow/70 hover:bg-cyan-glow/5 text-neutral-100",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
            aria-pressed={isSelected}
        >
            <div className="flex justify-between items-center mb-2">
                <h5 className={cn(
                    "font-semibold",
                    isSelected ? "text-cyan-glow" : "text-neutral-100"
                )}>
                    {license.name}
                </h5>
                <span className={cn(
                    "font-semibold text-lg",
                    isSelected ? "text-cyan-glow" : "text-neutral-100"
                )}>
                    ${license.price.toFixed(2)}
                </span>
            </div>
            <div className="text-xs text-neutral-400">
                <p>Includes: {license.includedFiles.join(', ')}</p>
                {/* Optionally add a very short description or key benefit here */}
            </div>
        </button>
    );
} 