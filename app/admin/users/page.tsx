import prisma from "@/lib/prisma";
import { User, UserRole } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns'; // For formatting dates
// We need a client component to handle the role change interaction
import { UserRoleChanger } from "./_components/UserRoleChanger"; 

// Type safety for fetched user data
type DisplayUser = Pick<User, 'id' | 'email' | 'name' | 'username' | 'role' | 'createdAt'>;

async function getUsers(): Promise<DisplayUser[]> {
  // Admin check will be handled by the layout
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      role: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  return users;
}

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">User Management</h1>
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.name || '-'}</TableCell>
                  <TableCell>{user.username || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === UserRole.ADMIN ? 'destructive' : user.role === UserRole.PRODUCER ? 'secondary' : 'outline'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(user.createdAt, 'PP')}</TableCell> 
                  <TableCell className="text-right">
                    {/* Role Changer Component */}
                     <UserRoleChanger userId={user.id} currentRole={user.role} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 