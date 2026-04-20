'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NavLinks } from './NavLinks'
import { X } from 'lucide-react'

interface AppSidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const pathname = usePathname()

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isOpen) onClose?.()
  }, [pathname])


  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen || !onClose) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          role="button"
          tabIndex={0}
          aria-label="Close navigation menu"
          onClick={onClose}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClose?.()}
          className="fixed inset-0 z-20 bg-black/50 md:hidden" 
        />
      )}

      <aside 
        id="app-sidebar" 
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-transform duration-300 ease-in-out md:static md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-6">
          <span className="font-display text-xl font-bold tracking-tight text-[var(--color-text)]">
            Algebro
          </span>

          {/* Close button — mobile only */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="md:hidden flex items-center justify-center min-w-[44px] min-h-[44px] rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-offset)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        
        <div className="flex-1 py-4">
          <NavLinks />
        </div>
      </aside>
    </>
  )
}

