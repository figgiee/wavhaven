import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getTrackById } from '@/server-actions/trackActions';
import AudioPlayer from '@/components/features/AudioPlayer';
import { LicenseSelector } from '@/components/features/LicenseSelector';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils'; // Assuming utils exist
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TrackDetailPageProps {
  params: Promise<{
    trackId: string;
  }>;
}

export default async function TrackDetailPage(props: TrackDetailPageProps) {
  const params = await props.params;
  const trackId = params.trackId;
  const track = await getTrackById(trackId);

  if (!track) {
    notFound(); // Trigger 404 if track not found or not published
  }

  // Use storeName from sellerProfile if available, fallback gracefully
  const sellerName = track.sellerProfile?.storeName ?? 'Unknown Artist';

  return (
    // Use max-w-6xl for a slightly wider container, adjust as needed
    <div className="container mx-auto px-4 pt-24 pb-8 max-w-6xl">
      <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
        {/* Left Column: Image & Audio Player */}
        <div className="md:col-span-1 flex flex-col gap-6">
          {/* Image Card */}
          <Card className="overflow-hidden shadow-md">
            <CardContent className="p-0">
              <div className="aspect-square bg-muted relative">
                {track.coverImageUrl ? (
                   <Image
                     src={track.coverImageUrl} // Corrected field name
                     alt={`${track.title} cover art`}
                     fill
                     sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                     className="object-cover"
                     priority
                   />
                 ) : (
                   <div className="flex items-center justify-center h-full text-muted-foreground bg-card border rounded-lg">
                     <span>No Image</span>
                   </div>
                 )}
              </div>
            </CardContent>
          </Card>

          {/* Audio Player Card - Conditionally Rendered */}
          {track.previewAudioUrl ? (
            <Card>
              <CardContent className="p-4">
                 <AudioPlayer audioUrl={track.previewAudioUrl} trackId={track.id} trackTitle={track.title} />
              </CardContent>
            </Card>
          ) : (
             <Card>
                <CardContent className="p-4">
                    <p className="text-center text-muted-foreground">Preview not available.</p>
                </CardContent>
             </Card>
          )}
        </div>

        {/* Right Column: Details & Licensing */}
        <div className="md:col-span-2 space-y-6">
          {/* Track Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl md:text-4xl font-bold">{track.title}</CardTitle>
              {/* Link to seller profile (implement later) */}
              <CardDescription className="text-lg pt-1">By {sellerName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               {/* Basic Metadata */}
              <div className="flex flex-wrap gap-2">
                {track.genre && <Badge variant="outline">{track.genre}</Badge>}
                {track.mood && <Badge variant="outline">{track.mood}</Badge>}
                {track.bpm && <Badge variant="secondary">BPM: {track.bpm}</Badge>}
                {track.key && <Badge variant="secondary">Key: {track.key}</Badge>}
                {track.tags && track.tags.map((tag: string) => <Badge key={tag} variant="outline">{tag}</Badge>)} 
              </div>

               {/* Description */}
               {track.description && (
                 <p className="text-base text-foreground/80">{track.description}</p>
               )}
            </CardContent>
            {/* Optional Footer for actions like share? */}
            {/* <CardFooter>...</CardFooter> */}
          </Card>

          {/* License Selection Card */}
          <Card>
             <CardHeader>
               <CardTitle className="text-xl">Purchase License</CardTitle>
             </CardHeader>
             <CardContent>
                {track.licenses && track.licenses.length > 0 ? (
                   <LicenseSelector 
                      licenses={track.licenses} 
                      trackId={track.id} 
                      trackTitle={track.title} 
                      producerName={sellerName} 
                      imageUrl={track.coverImageUrl} // Corrected field name
                   />
                 ) : (
                   <p className="text-muted-foreground">No licenses available for purchase yet.</p>
                 )}
            </CardContent>
          </Card>
           {/* Add other sections like comments, related tracks later using more Cards */}
        </div>
      </div>
    </div>
  );
}

// Optional: Add generateMetadata function for SEO
// export async function generateMetadata({ params }: TrackDetailPageProps): Promise<Metadata> {
//   const track = await getTrackById(params.trackId);
//   if (!track) {
//     return { title: 'Track Not Found' };
//   }
//   return {
//     title: `${track.title} by ${track.sellerProfile?.storeName ?? 'Unknown Artist'}`,
//     description: track.description || `Listen to and purchase a license for ${track.title}`,
//     // Add open graph tags etc.
//   };
// } 