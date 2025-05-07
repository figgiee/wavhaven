'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

const sidebarNavItems = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Moderation", href: "/admin/moderation", icon: ShieldCheck },
  // Add other admin links here
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-background p-4 flex flex-col">
      <h2 className="text-xl font-semibold mb-6">Admin Panel</h2>
      <nav className="flex-1 space-y-2">
        {sidebarNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
              pathname === item.href && "bg-muted text-primary"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.title}
          </Link>
        ))}
      </nav>
      {/* Optional: Footer or other elements */}
    </aside>
  );
} 