// Placeholder import for the client form component we will create
// import EditTrackForm from '@/components/features/EditTrackForm'; 

import { notFound } from 'next/navigation';
// Import the client form component
import EditTrackForm from '@/components/features/EditTrackForm'; 
import { getTrackForEdit } from '@/server-actions/trackActions'; // Import the action
import type { TrackForEdit } from '@/types'; // Import the type

interface EditTrackPageProps {
  params: {
    trackId: string;
  };
}

// Keep async as this is now a Server Component
export default async function EditTrackPage({ params }: EditTrackPageProps) {
  // Destructure trackId *inside* the async function body
  const trackId = params?.trackId;

  // Add a check here before calling the action
  if (!trackId) {
      console.error("EditTrackPage: trackId is missing from params");
      notFound(); // Or return an error component
  }

  // --- Fetch track data using the action, passing the validated trackId string --- 
  const trackData = await getTrackForEdit(trackId);
  
  // Handle track not found or permission denied
  if (!trackData) {
     notFound(); // Use Next.js notFound helper
  }
  // --- End Fetch --- 

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Edit Track: {trackData.title}</h1>
      {/* Render the Client Component form, passing fetched data */}
      <EditTrackForm track={trackData} />
      {/* <p>Form placeholder for track: {trackData.title} (ID: {trackData.id})</p> */}
    </div>
  );
} 