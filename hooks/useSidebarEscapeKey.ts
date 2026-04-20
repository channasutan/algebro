import { useEffect } from 'react'

export function useSidebarEscapeKey(
  isOpen: boolean | undefined,
  onClose: (() => void) | undefined
) {
  useEffect(() => {
    if (!isOpen || !onClose) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])
}
