import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { redirect } from 'next/navigation';
import { getInternalUserId } from "@/lib/userUtils";
import { ProfileForm } from '@/components/forms/ProfileForm';
import { UserRole } from '@prisma/client';

// Fetch user data server-side
async function getUserProfileData(clerkUserId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    select: {
      name: true,
      role: true,
      sellerProfile: {
        select: {
          storeName: true,
          bio: true,
        },
      },
    },
  });
  return user;
}

export default async function ProfileSettingsPage() {
  const user = await currentUser();

  if (!user || !user.id) {
    redirect('/sign-in'); // Redirect if not logged in
  }

  const profileData = await getUserProfileData(user.id);

  if (!profileData) {
    // This might happen if Clerk user exists but DB sync failed
    // Or if using getInternalUserId failed previously
    // Consider redirecting or showing an error
    // For now, redirecting to a generic error or home might be suitable
    console.error(`Could not find profile data for Clerk user ${user.id}`);
    redirect('/'); // Or redirect to an error page
  }

  const initialData = {
    name: profileData.name,
    storeName: profileData.sellerProfile?.storeName ?? null,
    bio: profileData.sellerProfile?.bio ?? null,
  };

  const isProducer = profileData.role === UserRole.PRODUCER;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Account Settings</h1>
      <ProfileForm initialData={initialData} isProducer={isProducer} />
    </div>
  );
} 