'use client';

import * as React from 'react';
import { UserRole } from '@prisma/client';
import { updateUserRole } from '@/server-actions/userActions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MoreHorizontal } from 'lucide-react';

interface UserRoleChangerProps {
  userId: string;
  currentRole: UserRole;
}

// Define the roles that can be assigned via this component
const assignableRoles: UserRole[] = [UserRole.CUSTOMER, UserRole.PRODUCER, UserRole.ADMIN];

export function UserRoleChanger({ userId, currentRole }: UserRoleChangerProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleChangeRole = async (newRole: UserRole) => {
    if (newRole === currentRole || isSubmitting) {
      return; // Don't do anything if role is the same or already submitting
    }

    setIsSubmitting(true);
    try {
      const result = await updateUserRole({ targetUserId: userId, newRole });
      if (result.success) {
        toast.success(`User role updated to ${newRole}`);
        // Revalidation is handled by the server action, no need for router.refresh() here
      } else {
        toast.error(result.error || 'Failed to update role.');
      }
    } catch (error) {
      console.error("Error changing user role:", error);
      toast.error('An unexpected client-side error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isSubmitting}>
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Change Role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {assignableRoles.map((role) => (
          <DropdownMenuItem
            key={role}
            disabled={role === currentRole || isSubmitting} // Disable current role and while submitting
            onClick={() => handleChangeRole(role)}
            className="cursor-pointer"
          >
            Set as {role}
          </DropdownMenuItem>
        ))}
        {/* Add other actions like "Suspend User" here later if needed */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 