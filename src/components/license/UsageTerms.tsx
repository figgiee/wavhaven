'use client';

import type { License } from '@/types';

interface UsageTermsProps {
    license: License;
}

export function UsageTerms({ license }: UsageTermsProps) {
    return (
        <div className="space-y-3">
            {/* Display included files first for clarity */}
            <div className="flex items-center gap-2 text-sm text-gray-300">
                {/* Placeholder icon - could use Package or similar */}
                <span className="w-5 h-5 flex items-center justify-center text-indigo-400">&#x1F4E6;</span> {/* Package emoji as placeholder */}
                <span>Includes: {license.includedFiles.join(', ')}</span>
            </div>
            
            {/* Map over actual usage terms */}
            {license.usageTerms && license.usageTerms.length > 0 ? (
                license.usageTerms.map((term, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-gray-300">
                        <span className="w-5 h-5 flex items-center justify-center text-indigo-400">
                            {term.icon || '✔'} {/* Render icon or fallback */}
                        </span>
                        <span>{term.label}</span>
                    </div>
                ))
            ) : (
                <p className="text-sm text-gray-500 italic">No specific usage terms provided.</p>
            )}
        </div>
    );
} 