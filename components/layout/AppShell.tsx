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
  readonly displayName: string | null;
  readonly email: string;
}

export function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<UserState | null>(null);
  const [isUserLoaded, setIsUserLoaded] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('Session resolution error:', error.message);
          setIsUserLoaded(true);
          return;
        }

        if (user) {
          setUser({
            displayName: user.user_metadata?.display_name || user.user_metadata?.full_name || null,
            email: user.email ?? '',
          });
        }
      } catch (err) {
        console.error('Unexpected auth error:', err);
      } finally {
        setIsUserLoaded(true);
      }
    };
    fetchUser();
  }, []);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className={cn("min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)]")}>
      <div className="mx-auto flex min-h-dvh flex-row">
        {user ? (
          <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} user={user} />
        ) : (
          <div
            aria-hidden="true"
            className={cn(
              "w-[var(--sidebar-width)] shrink-0 hidden md:block bg-[var(--color-surface)] border-r border-[var(--color-border)]",
              !isUserLoaded && "animate-pulse"
            )}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader 
            onMenuToggle={toggleSidebar} 
            isSidebarOpen={isSidebarOpen} 
            isMenuEnabled={isUserLoaded && user !== null}
          />
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
