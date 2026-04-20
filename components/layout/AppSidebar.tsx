'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { NavLinks } from './NavLinks'
import { X } from 'lucide-react'
import { useCloseSidebarOnNavigation } from '@/hooks/useCloseSidebarOnNavigation'

interface AppSidebarProps {
  readonly isOpen?: boolean
  readonly onClose?: () => void
}

interface SidebarOverlayProps {
  readonly isOpen: boolean | undefined
  readonly onClose: (() => void) | undefined
}

function SidebarOverlay({ isOpen, onClose }: SidebarOverlayProps) {
  if (!isOpen) return null

  return (
    <button
      type="button"
      aria-label="Close navigation menu"
      onClick={onClose}
      className="fixed inset-0 z-20 bg-black/50 md:hidden cursor-default"
    />
  )
}

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  useCloseSidebarOnNavigation(isOpen, onClose)

  const dialogRef = useRef<HTMLDialogElement>(null)

  // Sync isOpen state with native dialog open/close
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    // On mobile: use showModal for focus trap + native Escape support
    // On desktop: sidebar is static (md:static), so no modal needed
    if (isOpen) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [isOpen])

  // Sync native dialog Escape event back to onClose
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleCancel = (e: Event) => {
      e.preventDefault() // prevent default close so our state drives it
      onClose?.()
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onClose])

  return (
    <>
      <SidebarOverlay isOpen={isOpen} onClose={onClose} />

      <dialog
        ref={dialogRef}
        id="app-sidebar"
        aria-label="Navigation menu"
        className={cn(
          'fixed inset-y-0 left-0 z-30 m-0 flex w-[260px] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:block',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between px-6">
          <span className="font-display text-xl font-bold tracking-tight text-[var(--color-text)]">
            Algebro
          </span>

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
      </dialog>
    </>
  )
}

