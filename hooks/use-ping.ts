import { useQuery } from '@tanstack/react-query'

export function usePing() {
  return useQuery({
    queryKey: ['ping'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 300))
      return { ok: true, timestamp: Date.now() }
    },
    staleTime: 10_000,
  })
}
