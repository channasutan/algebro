'use client'

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'
import { AccuracyChartEmpty } from './accuracy-chart-empty'
import type { AccuracyDataPoint } from '@/modules/dashboard/types/accuracy-chart'

const chartConfig = {
  accuracy: {
    label: 'Accuracy',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig

type AccuracyChartProps = {
  data: AccuracyDataPoint[]
}

export function AccuracyChart({ data }: AccuracyChartProps) {
  if (data.length === 0) return <AccuracyChartEmpty />

  return (
    <ChartContainer config={chartConfig} className="aspect-video w-full">
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value: number) => `${value}%`}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value) => [`${value}%`, 'Accuracy']}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="accuracy"
          stroke="var(--color-accuracy)"
          strokeWidth={2}
          dot={{ r: 4, strokeWidth: 2 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ChartContainer>
  )
}
