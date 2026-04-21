'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, BookOpen, Library, LogOut } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client'
import { cn } from '@/lib/utils'

// AlgebroLogo component - Using text as SVG was not found in the repo
function AlgebroLogo({ className }: { className?: string }) {
  return (
    <span className={cn('font-display text-xl font-bold tracking-tight text-[var(--color-text)]', className)}>
      Algebro
    </span>
  )
}

// Nav items definition
const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/practice',  label: 'Practice',  icon: BookOpen },
  { href: '/topics',    label: 'Topics',    icon: Library },
] as const

type SidebarProps = Readonly<{
  isOpen: boolean;
  onClose?: () => void;
  user: Readonly<{
    displayName: string | null;
    email: string | null;
  }>;
}>;

export function Sidebar({ isOpen, onClose, user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [isMobile, setIsMobile] = useState(false)

  // Track viewport size for conditional inert attribute
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Derive initials for avatar fallback
  const initials = (user.displayName ?? user.email ?? '?')
    .split(' ')
    .map((n) => n)
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'

  // Sign out handler
  async function handleSignOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Sign out error:', error.message)
      return
    }
    router.push('/sign-in')
  }

  return (
    <>
      {/* Backdrop - Mobile only, closes when clicking outside */}
      {isOpen && (
        <button
          type="button"
          onClick={onClose}
          // z-30: above header (z-20) so tapping backdrop on mobile works,
          // below sidebar panel (z-40) so sidebar is always on top.
          className="fixed inset-0 z-30 bg-black/50 transition-opacity duration-200 md:hidden animate-in fade-in"
          aria-label="Close navigation menu"
        />
      )}

      <aside
        aria-label="Main navigation"
        // On mobile: inert when closed. On desktop: never inert (always visible).
        inert={isMobile && !isOpen ? true : undefined}
        className={cn(
          // Mobile: fixed overlay that slides in/out
          'fixed inset-y-0 left-0 z-40 flex flex-col',
          // Desktop: in-flow, always visible, no overlay
          'md:static md:inset-auto md:z-auto md:translate-x-0',
          'w-[var(--sidebar-width)] shrink-0',
          'bg-[var(--color-surface)] border-r border-[var(--color-border)]',
          'transition-transform duration-200 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center px-4 border-b border-[var(--color-border)]">
          <AlgebroLogo className="h-8 flex items-center" />
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-4 px-2" aria-label="Sidebar">
          <ul role="list" className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/')
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => onClose?.()} // Close on navigation (mobile)
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2',
                      'text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[var(--color-primary-highlight)] text-[var(--color-primary)]'
                        : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)] hover:text-[var(--color-text)]'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon
                      size={18}
                      aria-hidden="true"
                      className="shrink-0"
                    />
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t border-[var(--color-border)] p-4 flex items-center gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-highlight)] text-[var(--color-primary)] text-xs font-semibold"
            aria-hidden="true"
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--color-text)] truncate">
              {user.displayName ?? user.email}
            </p>
          </div>

          <button
            onClick={handleSignOut}
            type="button"
            aria-label="Sign out"
            className="rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)] hover:text-[var(--color-text)] transition-colors"
          >
            <LogOut size={16} aria-hidden="true" />
          </button>
        </div>
      </aside>
    </>
  )
}
