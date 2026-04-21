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
  readonly email: string | null;
}

export function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [authState, setAuthState] = useState<
    | { status: 'loading' }
    | { status: 'authenticated'; user: UserState }
    | { status: 'unauthenticated' }
    | { status: 'error' }
  >({ status: 'loading' });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = globalThis.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('Session resolution error:', error.message);
          setAuthState({ status: 'error' });
          return;
        }

        if (user) {
          setAuthState({
            status: 'authenticated',
            user: {
              displayName: user.user_metadata?.display_name || user.user_metadata?.full_name || null,
              email: user.email ?? null,
            },
          });
        } else {
          setAuthState({ status: 'unauthenticated' });
        }
      } catch (err) {
        console.error('Unexpected auth error:', err);
        setAuthState({ status: 'error' });
      }
    };
    fetchUser();
  }, []);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto flex min-h-dvh flex-row">
        {authState.status === 'authenticated' ? (
          <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} user={authState.user} />
        ) : (
          <div
            aria-hidden="true"
            className={cn(
              "w-[var(--sidebar-width)] shrink-0 hidden md:block bg-[var(--color-surface)] border-r border-[var(--color-border)]",
              authState.status === 'loading' && "animate-pulse"
            )}
          />
        )}
        <div 
          className="flex min-w-0 flex-1 flex-col"
          inert={isMobile && isSidebarOpen ? true : undefined}
        >
          <AppHeader 
            onMenuToggle={toggleSidebar} 
            isSidebarOpen={isSidebarOpen} 
            isMenuEnabled={authState.status === 'authenticated'}
          />
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
