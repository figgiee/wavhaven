'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter
import { toast } from 'sonner'; // Import toast
import { useCartStore } from '@/stores/use-cart-store'; // Import cart store
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { fetchLicensesForTrack } from '@/server-actions/trackActions';
import type { License } from './license.types'; // Import shared type
import { LicenseOptionCard } from './LicenseOptionCard'; 
import { UsageTerms } from './UsageTerms';
// import { LicenseModalFooter } from './LicenseModalFooter';

interface LicenseModalProps {
    trackId: string | number; // Accept string or number based on BeatCard
    trackTitle: string;
    trackArtist: string; // Added artist name
    trackImageUrl?: string; // Added optional image URL
    isOpen: boolean;
    onClose: () => void;
}

export function LicenseModal({ 
    trackId, 
    trackTitle, 
    trackArtist, 
    trackImageUrl, 
    isOpen, 
    onClose 
}: LicenseModalProps) {
    const [licenses, setLicenses] = useState<License[]>([]);
    const [selectedLicenseId, setSelectedLicenseId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter(); // Get router instance

    // Get addItem action from cart store
    const addItemToCart = useCartStore((state) => state.addItem);

    useEffect(() => {
        // Fetch licenses only when the modal opens and trackId is valid
        if (isOpen && trackId) {
            setIsLoading(true);
            setError(null);
            setLicenses([]); // Clear previous licenses
            setSelectedLicenseId(null); // Clear previous selection

            fetchLicensesForTrack(String(trackId)) // Ensure trackId is string for server action
                .then(fetchedLicenses => {
                    setLicenses(fetchedLicenses);
                    // Default selection (e.g., first or cheapest)
                    if (fetchedLicenses.length > 0) {
                        // TODO: Implement logic to select cheapest or default
                        setSelectedLicenseId(fetchedLicenses[0].id);
                    }
                })
                .catch(err => {
                    console.error("Failed to fetch licenses:", err);
                    setError(err.message || "Could not load license options.");
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [isOpen, trackId]); // Dependency array

    const selectedLicense = licenses.find(l => l.id === selectedLicenseId);

    // Updated handleAddToCart logic
    const handleAddToCart = () => {
        if (!selectedLicense) {
            toast.warning("Please select a license first.");
            return;
        }

        const cartItem = {
            id: trackId, // Use the trackId passed in props
            licenseId: selectedLicense.id,
            title: trackTitle,
            artist: trackArtist,
            price: selectedLicense.price,
            imageUrl: trackImageUrl,
            licenseType: selectedLicense.name, // Use the selected license name as the type
            // Ensure all required fields for CartItem are included
        };

        console.log('Adding to cart:', cartItem);
        addItemToCart(cartItem);
        toast.success(`${trackTitle} (${selectedLicense.name}) added to cart!`);
        onClose(); // Close modal after adding
    };

    // Updated handleBuyNow logic
    const handleBuyNow = () => {
        if (!selectedLicense) {
            toast.warning("Please select a license first.");
            return;
        }

        // Construct cart item (same as in handleAddToCart)
        const cartItem = {
            id: trackId, 
            licenseId: selectedLicense.id,
            title: trackTitle,
            artist: trackArtist,
            price: selectedLicense.price,
            imageUrl: trackImageUrl,
            licenseType: selectedLicense.name, 
        };

        console.log('Buying now - Adding to cart first:', cartItem);
        addItemToCart(cartItem); 
        
        // Redirect to checkout page
        // Ensure the checkout page can handle receiving the cart state
        router.push('/checkout'); 

        // Optionally close the modal after navigation starts, 
        // though navigation might unmount it anyway.
        onClose(); 
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}> 
            <DialogContent className="sm:max-w-[800px] bg-gray-900 border-gray-700 text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl">Choose License for "{trackTitle}"</DialogTitle>
                    <DialogDescription>
                        Select the license that best fits your needs.
                    </DialogDescription>
                </DialogHeader>

                {isLoading && (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                        <span className="ml-2">Loading licenses...</span>
                    </div>
                )}

                {error && (
                    <div className="flex flex-col items-center justify-center py-10 text-red-400">
                        <AlertCircle className="h-8 w-8 mb-2" />
                        <p>Error loading licenses:</p>
                        <p className="text-sm text-red-500">{error}</p>
                        {/* Optionally add a retry button */}
                    </div>
                )}

                {!isLoading && !error && licenses.length === 0 && (
                     <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <AlertCircle className="h-8 w-8 mb-2" />
                        <p>No licenses available for this track.</p>
                    </div>
                )}

                {!isLoading && !error && licenses.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        {/* Left Column: License Options */}
                        <div className="space-y-3 pr-3 overflow-y-auto max-h-[50vh]">
                            {licenses.map((license) => (
                                 <LicenseOptionCard 
                                     key={license.id} 
                                     license={license} 
                                     isSelected={selectedLicenseId === license.id} 
                                     onSelect={() => setSelectedLicenseId(license.id)}
                                 /> 
                            ))}
                        </div>

                        {/* Right Column: Usage Terms for selected license */}
                        <div className="border-l border-gray-700 pl-6">
                           {selectedLicense ? (
                               <div>
                                   <h4 className="font-semibold mb-3 text-lg">Usage Terms for {selectedLicense.name}</h4>
                                    <UsageTerms license={selectedLicense} />
                               </div>
                           ) : (
                                <p className="text-gray-500">Select a license to view terms.</p>
                           )}
                        </div>
                    </div>
                )}

                <DialogFooter className="mt-4 sm:justify-between">
                    {/* Left Aligned Cancel Button */} 
                    <DialogClose asChild>
                        <Button type="button" variant="outline" className="sm:mr-auto">Cancel</Button>
                    </DialogClose>
                    
                    {/* Right Aligned Action Buttons */} 
                     <div className="flex gap-2 justify-end">
                        <Button 
                            type="button" 
                            onClick={handleAddToCart} 
                            disabled={!selectedLicense || isLoading}
                            variant="secondary" // Make Add to Cart secondary?
                        >
                            Add to Cart
                        </Button>
                        <Button 
                            type="button" 
                            onClick={handleBuyNow} 
                            disabled={!selectedLicense || isLoading}
                            className="bg-indigo-500 hover:bg-indigo-600"
                        >
                            Buy Now
                        </Button>
                     </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 