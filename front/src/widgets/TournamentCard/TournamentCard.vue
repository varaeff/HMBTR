<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { dateToString, tData } from '@/lib/utils'
import type { Tournament } from '@/model'

const props = defineProps<{
  tournament: Tournament
}>()

const tournamentPlace = computed(() => {
  return props.tournament.city ? `${props.tournament.country}, ${props.tournament.city}` : ''
})
</script>

<template>
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle>{{ tData(props.tournament.name) }}</CardTitle>
      <CardDescription>
        {{ tData(tournamentPlace) }}
      </CardDescription>
    </CardHeader>
    <CardContent>
      {{ dateToString(tournament.event_date) }}
    </CardContent>
  </Card>
</template>
