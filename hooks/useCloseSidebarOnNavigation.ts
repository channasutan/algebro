import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Custom hook to close the sidebar whenever the route changes.
 * Used primarily for mobile navigation.
 */
export function useCloseSidebarOnNavigation(
  isOpen: boolean | undefined,
  onClose: (() => void) | undefined
) {
  const pathname = usePathname()

  useEffect(() => {
    if (isOpen) {
      onClose?.()
    }
  }, [pathname])
  // Intentional: only re-run on route change, not when isOpen/onClose change identity
}
