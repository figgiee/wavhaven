import { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { AdminSidebar } from "./_components/AdminSidebar"; // Example sidebar component

// Function to check admin role server-side
async function checkAdminAuth() {
  const { userId } = auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { role: true },
  });

  if (user?.role !== UserRole.ADMIN) {
    console.warn(`Non-admin user ${userId} attempted to access admin area.`);
    redirect('/'); // Redirect non-admins to home page
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await checkAdminAuth(); // Protect the layout

  return (
    <div className="flex min-h-screen">
      {/* Optional: Add an admin-specific sidebar */}
      <AdminSidebar /> 
      <main className="flex-1 p-6 bg-muted/40">
        {children}
      </main>
    </div>
  );
} 