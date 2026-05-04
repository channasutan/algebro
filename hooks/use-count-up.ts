'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Animates a number from 0 to `end` using requestAnimationFrame.
 * Automatically respects prefers-reduced-motion — shows final value
 * immediately if the user has opted out of animations.
 *
 * @param end      Target number to count up to
 * @param duration Animation duration in ms (default: 1200)
 * @returns        Current animated value (integer via Math.round)
 */
export function useCountUp(end: number, duration = 1200): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    // React 19: useEffect fires after paint — correct for animation triggers
    // MDN: matchMedia is the recommended API for prefers-reduced-motion
    const prefersReduced = globalThis.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReduced) {
      setValue(end)
      return
    }

    // Reset to 0 when `end` changes (e.g. data refetch)
    setValue(0)

    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic — fast start, decelerate to final value
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * end))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    // Cleanup: cancel pending frame on unmount or when deps change
    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [end, duration])

  return value
}
