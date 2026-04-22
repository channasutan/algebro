'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { AppHeader } from './AppHeader';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { AuthSessionMissingError } from '@supabase/supabase-js';
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
    let isMounted = true;

    const fetchUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (error) {
          if (error instanceof AuthSessionMissingError) {
            setAuthState({ status: 'unauthenticated' });
          } else {
            setAuthState({ status: 'error' });
          }
          return;
        }

        if (user) {
          setAuthState({
            status: 'authenticated',
            user: {
              displayName:
                user.user_metadata?.display_name ??
                user.user_metadata?.full_name ??
                null,
              email: user.email ?? null,
            },
          });
        } else {
          setAuthState({ status: 'unauthenticated' });
        }
      } catch {
        if (isMounted) setAuthState({ status: 'error' });
      }
    };

    fetchUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      isMounted = false; // listener won — discard any in-flight fetchUser result
      if (session?.user) {
        setAuthState({
          status: 'authenticated',
          user: {
            displayName:
              session.user.user_metadata?.display_name ??
              session.user.user_metadata?.full_name ??
              null,
            email: session.user.email ?? null,
          },
        });
      } else {
        setAuthState({ status: 'unauthenticated' });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    /* Outer shell — viewport height, overflow hidden, NO scroll */
    <div className="flex h-dvh overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      {authState.status === 'authenticated' ? (
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
          user={authState.user}
        />
      ) : (
        <div
          aria-hidden="true"
          className={cn(
            'w-[var(--sidebar-width)] shrink-0 hidden md:block',
            'bg-[var(--color-surface)] border-r border-[var(--color-border)]',
            authState.status === 'loading' && 'animate-pulse'
          )}
        />
      )}

      {/* Right column — flex-col, min-w-0 prevents flex overflow blowout */}
      <div
        className="flex flex-1 flex-col min-w-0 overflow-hidden"
        inert={isMobile && isSidebarOpen ? true : undefined}
      >
        <AppHeader
          onMenuToggle={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
          isMenuEnabled={authState.status === 'authenticated'}
        />

        {/* THE SINGLE SCROLL REGION */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
