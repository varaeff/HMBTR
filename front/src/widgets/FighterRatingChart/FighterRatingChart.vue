<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTranslation } from 'i18next-vue'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import type { FighterRatingHistoryPoint } from '@/model'
import { dateToString } from '@/lib/dateUtils'
import { tData } from '@/lib/utils'

type Language = 'ru' | 'en'

const INITIAL_RATING = 1000
const chartWidth = 720
const chartHeight = 300
const chartPaddingLeft = 56
const chartPaddingRight = 24
const chartPaddingTop = 24
const chartPaddingBottom = 56
const chartPlotWidth = chartWidth - chartPaddingLeft - chartPaddingRight
const chartPlotHeight = chartHeight - chartPaddingTop - chartPaddingBottom

interface RatingChartPoint {
  label: string
  value: number
  tournamentName?: string | null
}

interface RatingChartCoordinate extends RatingChartPoint {
  x: number
  y: number
}

interface RatingChartTick {
  value: number
  y: number
}

interface RatingChartTooltip {
  tournamentName: string
  label: string
  value: number
  style: Record<string, string>
}

const props = defineProps<{
  history: FighterRatingHistoryPoint[]
}>()

const { i18next } = useTranslation()
const activePointIndex = ref<number | null>(null)
const currentLanguage = computed<Language>(() => (i18next.language === 'en' ? 'en' : 'ru'))
const ratingChartConfig = {
  rating: {
    label: i18next.t('ratingPageRating'),
    color: 'var(--primary)'
  }
} satisfies ChartConfig

const formatProfileDate = (date: string | null) => dateToString(date ? new Date(date) : null)

const chartPoints = computed<RatingChartPoint[]>(() => [
  {
    label: i18next.t('fighterPageRatingStart'),
    value: INITIAL_RATING
  },
  ...props.history.map((point) => ({
    label: formatProfileDate(point.event_date) || formatProfileDate(point.created_at),
    value: point.rating_after,
    tournamentName: point.tournament_name
  }))
])

const valueBounds = computed(() => {
  const values = chartPoints.value.map((point) => point.value)
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const padding = Math.max(Math.round((rawMax - rawMin) * 0.1), 10)
  const min = rawMin - padding
  const max = rawMax + padding

  return { min, max, range: max - min || 1 }
})

const coordinates = computed<RatingChartCoordinate[]>(() => {
  const { min, range } = valueBounds.value
  const horizontalStep =
    chartPoints.value.length > 1 ? chartPlotWidth / (chartPoints.value.length - 1) : 0

  return chartPoints.value.map((point, index) => {
    const x =
      chartPoints.value.length > 1
        ? chartPaddingLeft + horizontalStep * index
        : chartPaddingLeft + chartPlotWidth / 2
    const y = chartPaddingTop + chartPlotHeight - ((point.value - min) / range) * chartPlotHeight

    return { ...point, x, y }
  })
})

const linePoints = computed(() =>
  coordinates.value.map((point) => `${point.x},${point.y}`).join(' ')
)

const ticks = computed<RatingChartTick[]>(() => {
  const { min, max } = valueBounds.value
  const steps = 4

  return Array.from({ length: steps + 1 }, (_, index) => ({
    value: Math.round(max - ((max - min) / steps) * index),
    y: chartPaddingTop + (chartPlotHeight / steps) * index
  }))
})

const activePoint = computed(() => {
  if (activePointIndex.value === null) return undefined

  return coordinates.value[activePointIndex.value]
})

const activeTooltip = computed<RatingChartTooltip | null>(() => {
  const point = activePoint.value

  if (!point?.tournamentName) return null

  const horizontalTransform =
    point.x < chartPaddingLeft + 80
      ? '-10%'
      : point.x > chartWidth - chartPaddingRight - 80
        ? '-90%'
        : '-50%'
  const verticalTransform = point.y < chartPaddingTop + 48 ? '0.75rem' : 'calc(-100% - 0.75rem)'

  return {
    tournamentName: tData(point.tournamentName, currentLanguage.value),
    label: point.label,
    value: point.value,
    style: {
      left: `${(point.x / chartWidth) * 100}%`,
      top: `${(point.y / chartHeight) * 100}%`,
      transform: `translate(${horizontalTransform}, ${verticalTransform})`
    }
  }
})

const setActivePoint = (index: number) => {
  activePointIndex.value = index
}

const clearActivePoint = () => {
  activePointIndex.value = null
}

const shouldShowLabel = (index: number) => {
  const pointCount = coordinates.value.length

  if (pointCount <= 6) return true
  if (index === 0 || index === pointCount - 1) return true

  return index % Math.ceil(pointCount / 6) === 0
}

const pointAriaLabel = (point: RatingChartPoint) => {
  const details = [`${point.label}: ${point.value}`]

  if (point.tournamentName) {
    details.unshift(tData(point.tournamentName, currentLanguage.value))
  }

  return details.join('. ')
}
</script>

<template>
  <ChartContainer
    :config="ratingChartConfig"
    class="relative h-80 min-w-0 overflow-hidden rounded-md border p-4 aspect-auto"
  >
    <div class="relative h-full w-full">
      <svg
        class="h-full w-full overflow-visible"
        :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
        role="img"
        :aria-label="$t('fighterPageRatingsTitle')"
      >
        <line
          :x1="chartPaddingLeft"
          :x2="chartPaddingLeft"
          :y1="chartPaddingTop"
          :y2="chartHeight - chartPaddingBottom"
          class="stroke-foreground"
          stroke-width="1.5"
        />
        <line
          :x1="chartPaddingLeft"
          :x2="chartWidth - chartPaddingRight"
          :y1="chartHeight - chartPaddingBottom"
          :y2="chartHeight - chartPaddingBottom"
          class="stroke-foreground"
          stroke-width="1.5"
        />
        <line
          v-for="(tick, index) in ticks"
          :key="`rating-grid-${index}`"
          :x1="chartPaddingLeft"
          :x2="chartWidth - chartPaddingRight"
          :y1="tick.y"
          :y2="tick.y"
          class="stroke-muted"
          stroke-width="1"
        />
        <text
          v-for="(tick, index) in ticks"
          :key="`rating-y-${index}`"
          :x="chartPaddingLeft - 10"
          :y="tick.y + 4"
          class="fill-muted-foreground text-[11px]"
          text-anchor="end"
        >
          {{ tick.value }}
        </text>
        <polyline
          v-if="coordinates.length > 1"
          :points="linePoints"
          fill="none"
          stroke="var(--color-rating)"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="3"
        />
        <line
          v-if="activePoint"
          :x1="activePoint.x"
          :x2="activePoint.x"
          :y1="chartPaddingTop"
          :y2="chartHeight - chartPaddingBottom"
          class="stroke-muted-foreground"
          stroke-dasharray="4 4"
          stroke-width="1"
        />
        <g
          v-for="(point, index) in coordinates"
          :key="`rating-point-${index}`"
          class="cursor-pointer outline-none"
          :tabindex="point.tournamentName ? 0 : -1"
          :aria-label="pointAriaLabel(point)"
          @mouseenter="setActivePoint(index)"
          @mouseleave="clearActivePoint"
          @focus="setActivePoint(index)"
          @blur="clearActivePoint"
        >
          <circle :cx="point.x" :cy="point.y" r="11" fill="transparent" />
          <circle
            :cx="point.x"
            :cy="point.y"
            :r="activePointIndex === index ? 6 : 4.5"
            fill="var(--color-rating)"
            class="stroke-background"
            stroke-width="2"
          />
          <line
            :x1="point.x"
            :x2="point.x"
            :y1="chartHeight - chartPaddingBottom"
            :y2="chartHeight - chartPaddingBottom + 5"
            class="stroke-foreground"
            stroke-width="1"
          />
          <text
            v-if="shouldShowLabel(index)"
            :x="point.x"
            :y="chartHeight - chartPaddingBottom + 20"
            class="fill-muted-foreground text-[11px]"
            text-anchor="middle"
          >
            {{ point.label }}
          </text>
        </g>
      </svg>
      <div
        v-if="activeTooltip"
        class="pointer-events-none absolute z-10 min-w-44 max-w-64 rounded-md border bg-background px-3 py-2 text-xs shadow-lg"
        :style="activeTooltip.style"
        role="tooltip"
      >
        <div class="font-medium leading-snug">
          {{ activeTooltip.tournamentName }}
        </div>
        <div class="mt-1 text-muted-foreground">
          {{ activeTooltip.label }}
        </div>
        <div class="mt-1 font-mono font-medium tabular-nums">
          {{ $t('ratingPageRating') }}: {{ activeTooltip.value }}
        </div>
      </div>
    </div>
  </ChartContainer>
</template>
