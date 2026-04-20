'use client'

import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface HeaderProps {
  onMenuToggle: () => void
  isSidebarOpen: boolean
}

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/practice':  'Practice',
  '/topics':    'Topics',
  '/progress':  'Progress',
}

export function Header({ onMenuToggle, isSidebarOpen }: HeaderProps) {
  const pathname = usePathname()
  const matchedRoute = Object.keys(ROUTE_TITLES).find(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  const pageTitle = matchedRoute ? ROUTE_TITLES[matchedRoute] : 'Algebro'

  return (
    <header className="sticky top-0 z-10 bg-[var(--color-surface)] border-b border-[var(--color-border)] h-16 flex items-center px-[var(--space-6)] gap-[var(--space-4)]">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuToggle}
        aria-label={isSidebarOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={isSidebarOpen}
        aria-controls="app-sidebar"
        className="md:hidden flex items-center justify-center min-w-[44px] min-h-[44px] rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-offset)] transition-colors"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Page title */}
      <span className="text-[var(--text-lg)] font-semibold text-[var(--color-text)] flex-1">
        {pageTitle}
      </span>

      {/* Theme toggle — right side */}
      <ThemeToggle />
    </header>
  )
}
