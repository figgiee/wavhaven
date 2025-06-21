import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react'; // Example icon
import type { TrackSearchResult } from '@/server-actions/trackActions';
import { formatCurrency } from '@/lib/utils'; // Assuming a currency formatting util

interface TrackCardProps {
  track: TrackSearchResult;
}

// Helper to find the lowest price among licenses (if needed for display)
// Note: In a real app, pricing might be more complex
const getLowestPrice = (track: TrackSearchResult): number | null => {
  // For now, let's assume a simple price field exists on the track
  // or we fetch licenses later. Placeholder logic:
  return track.price; // Using the price directly from the Track model
};


export default function TrackCard({ track }: TrackCardProps) {
  const lowestPrice = getLowestPrice(track);
  const sellerName = track.sellerProfile?.storeName ?? 'Unknown Artist'; // Use storeName if available

  return (
    <Card className="flex flex-col overflow-hidden h-full"> {/* Ensure card takes full height if needed */}
      <CardHeader className="p-0 relative aspect-square"> {/* Aspect ratio for image */}
         {/* Placeholder Image */}
         <div className="bg-muted flex items-center justify-center h-full w-full">
           <PlayCircle className="w-12 h-12 text-muted-foreground" /> {/* Simple placeholder icon */}
         </div>
         {/* TODO: Replace with actual Image component once imageUrl is available */}
        {/* {track.imageUrl && (
          <Image
            src={track.imageUrl}
            alt={`${track.title} cover art`}
            layout="fill"
            objectFit="cover"
            className="hover:scale-105 transition-transform duration-300 ease-in-out"
          />
        )} */}
         <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 rounded-full z-10 opacity-80 hover:opacity-100"
          // onClick={() => { /* TODO: Implement play preview functionality - Step 6.3 */ }}
          aria-label={`Play preview of ${track.title}`}
        >
          <PlayCircle className="w-5 h-5" />
        </Button>
      </CardHeader>
      <CardContent className="p-4 flex-grow"> {/* flex-grow allows content to push footer down */}
        <Link href={`/track/${track.id}`} className="hover:underline">
          <CardTitle className="text-lg font-semibold leading-tight mb-1 line-clamp-2">{track.title}</CardTitle>
        </Link>
        {/* Link to seller profile page (implement later) */}
        <p className="text-sm text-muted-foreground line-clamp-1">{sellerName}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <span className="text-base font-medium">
           {/* Display price - adjust based on actual license/price structure */}
           {lowestPrice !== null ? formatCurrency(lowestPrice / 100) : 'N/A'}
           {/* Placeholder: Display lowest license price */}
        </span>
         <Link href={`/track/${track.id}`} passHref>
          <Button variant="outline" size="sm">View</Button>
        </Link>
      </CardFooter>
    </Card>
  );
} 