import React from 'react';
import { currentUser } from '@clerk/nextjs/server';
import { OrderHistory } from '@/components/features/OrderHistory';
import { prisma } from '@/lib/db/prisma';
import { getInternalUserId } from '@/lib/userUtils'; // Assuming this utility exists

export default async function DownloadsPage() {
  const user = await currentUser();

  if (!user) {
    // This should ideally be handled by middleware, but as a fallback:
    // You could redirect here, or return null/message
    // For simplicity, returning null, assuming middleware redirects.
    return null; 
  }

  // Get the internal database User ID corresponding to the Clerk user ID
  let internalUserId: string | null = null;
  try {
    internalUserId = await getInternalUserId(user.id);
  } catch (error) {
    console.error("Error fetching internal user ID:", error);
    // Handle error appropriately - maybe show an error message to the user
    return <div className="container py-8"><p className="text-red-500">Error loading your account data.</p></div>;
  }

  if (!internalUserId) {
     // Handle case where internal user mapping doesn't exist yet (should be rare if sync works)
     return <div className="container py-8"><p>Could not find your account data. Please try again later.</p></div>;
  }

  // Fetch orders for the logged-in user using the internal ID
  const orders = await prisma.order.findMany({
    where: {
      customerId: internalUserId, // Use internal database User ID
    },
    include: {
      items: { 
        include: {
          license: { 
            include: {
              track: { 
                select: {
                  id: true,
                  title: true,
                  // coverImageUrl field doesn't exist in Track model
                  producer: { // Include the related producer
                    select: {
                      firstName: true,
                      lastName: true,
                      username: true // Select the producer's info
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc', 
    },
  });

  // Pass the fetched orders (with correct structure) to OrderHistory
  // Ensure OrderHistory component expects track.producer.name for the artist name
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">My Downloads</h1>
      {orders.length === 0 ? (
        <p>You haven't purchased any tracks yet.</p>
      ) : (
        <OrderHistory orders={orders} />
      )}
    </div>
  );
} 