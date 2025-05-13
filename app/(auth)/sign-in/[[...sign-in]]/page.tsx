import { SignIn } from "@clerk/nextjs";
import { sharedClerkAppearance } from "@/lib/clerk-appearance";

export default function Page() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-background to-neutral-900 p-4">
      <SignIn path="/sign-in" appearance={sharedClerkAppearance} />
    </div>
  );
} 