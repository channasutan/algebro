import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const SKELETON_KEYS = [
  'kpi-sk-problems',
  'kpi-sk-accuracy',
  'kpi-sk-streak',
  'kpi-sk-topics',
] as const

export function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {SKELETON_KEYS.map((key) => (
        <Card key={key} padding="md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardBody>
            <Skeleton className="mb-1 h-8 w-16 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </CardBody>
        </Card>
      ))}
    </div>
  )
}
