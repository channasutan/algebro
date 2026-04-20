'use client'

import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { navItems } from '@/lib/navigation'

interface HeaderProps {
  onMenuToggle: () => void
  isSidebarOpen: boolean
}

export function Header({ onMenuToggle, isSidebarOpen }: HeaderProps) {
  const pathname = usePathname()
  
  // Support prefix-match (longest match wins) for dynamic routes
  const matchedItem = [...navItems]
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]

  const pageTitle = matchedItem?.label ?? 'Algebro'

  return (
    <header className="sticky top-0 z-30 bg-[var(--color-surface)] border-b border-[var(--color-border)] h-16 flex items-center px-[var(--space-6)] gap-[var(--space-4)]">
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

