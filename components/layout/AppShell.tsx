'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { AppHeader } from './AppHeader';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { cn } from '@/lib/utils';

type AppShellProps = Readonly<{
  children: React.ReactNode;
}>;

interface UserState {
  displayName: string | null;
  email: string;
}

export function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<UserState | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser({
          displayName: user.user_metadata?.display_name || user.user_metadata?.full_name || null,
          email: user.email ?? '',
        });
      }
    };
    fetchUser();
  }, []);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className={cn("min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)]")}>
      <div className="mx-auto flex min-h-dvh">
        {user ? (
          <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} user={user} />
        ) : (
          <div className="w-[var(--sidebar-width)] hidden md:block bg-[var(--color-surface)] border-r border-[var(--color-border)]" />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
