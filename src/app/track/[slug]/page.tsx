import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getTrackBySlug } from '@/server-actions/tracks/trackQueries';
import { LicenseSelectorWithCart } from '@/components/features/LicenseSelectorWithCart';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TrackPlayerButton from '@/components/TrackPlayerButton';
import { AddToPlaylistButton } from '@/components/features/AddToPlaylistButton';
import { getUserPlaylists } from '@/server-actions/users/userQueries';
import { getInternalUserId } from '@/lib/userUtils';
import { auth } from '@clerk/nextjs/server';
import { ReportTrackButton } from '@/components/features/ReportTrackButton';
import { SimilarTracks } from '@/components/features/SimilarTracks';
import { CommentsSection } from '@/components/features/CommentsSection';
import { LikeButton } from '@/components/features/LikeButton';
import { getLikeStatus, getLikeCount } from '@/server-actions/interactionActions';

interface TrackDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function TrackDetailPage({ params }: TrackDetailPageProps) {
  const { slug } = await params;
  const track = await getTrackBySlug(slug);

  if (!track) {
    notFound();
  }

  const { userId: clerkId } = auth();
  let userPlaylists: { id: string, name: string }[] = [];
  let likeStatus = { isLiked: false, likeCount: 0 };

  if (clerkId) {
    const internalUserId = await getInternalUserId(clerkId);
    if (internalUserId) {
      userPlaylists = await getUserPlaylists(internalUserId);
    }
    // Get like status for authenticated user
    const likeResult = await getLikeStatus(track.id, clerkId);
    if (likeResult.success) {
      likeStatus = { isLiked: likeResult.isLiked || false, likeCount: likeResult.likeCount || 0 };
    }
  } else {
    // Get just the like count for non-authenticated users
    const likeCountResult = await getLikeCount(track.id);
    if (likeCountResult.success) {
      likeStatus = { isLiked: false, likeCount: likeCountResult.likeCount || 0 };
    }
  }

  const sellerName = track.producer?.username || 
                     `${track.producer?.firstName || ''} ${track.producer?.lastName || ''}`.trim() || 
                     'Unknown Artist';

  return (
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
                     src={track.coverImageUrl}
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

          {/* Track Player Button Card */}
          {track.previewAudioUrl ? (
            <Card>
              <CardContent className="p-4">
                 <TrackPlayerButton 
                   track={{
                     id: track.id,
                     title: track.title,
                     artist: sellerName,
                     audioSrc: track.previewAudioUrl,
                     coverImage: track.coverImageUrl,
                   }}
                 />
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
              <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-3xl md:text-4xl font-bold">{track.title}</CardTitle>
                    <CardDescription className="text-lg pt-1">By {sellerName}</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    {clerkId && (
                      <AddToPlaylistButton trackId={track.id} userPlaylists={userPlaylists} />
                    )}
                    <LikeButton
                      trackId={track.id}
                      initialIsLiked={likeStatus.isLiked}
                      initialLikeCount={likeStatus.likeCount}
                      size="lg"
                    />
                  </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
               {/* Basic Metadata */}
              <div className="flex flex-wrap gap-2">
                {track.bpm && <Badge variant="secondary">BPM: {track.bpm}</Badge>}
                {track.key && <Badge variant="secondary">Key: {track.key}</Badge>}
              </div>

               {/* Description */}
               {track.description && (
                 <p className="text-base text-foreground/80">{track.description}</p>
               )}
               
               {clerkId && (
                 <div className="pt-4 border-t border-neutral-800">
                    <ReportTrackButton trackId={track.id} />
                 </div>
               )}
            </CardContent>
          </Card>

          {/* License Selection Card */}
          <Card>
             <CardHeader>
               <CardTitle className="text-xl">Purchase License</CardTitle>
             </CardHeader>
             <CardContent>
                {track.licenses && track.licenses.length > 0 ? (
                   <LicenseSelectorWithCart track={track} sellerName={sellerName} />
                 ) : (
                   <p className="text-muted-foreground">No licenses available for purchase yet.</p>
                 )}
            </CardContent>
          </Card>

          {/* Similar Tracks Card */}
          <SimilarTracks trackId={track.id} />

          {/* Comments Section */}
          <CommentsSection 
            trackId={track.id} 
            title="Comments & Discussion"
            className="mt-6"
          />
        </div>
      </div>
    </div>
  );
}