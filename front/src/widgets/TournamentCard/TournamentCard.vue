<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
      <CardTitle>{{ props.tournament.name }}</CardTitle>
      <CardDescription>
        {{ tournamentPlace }}
      </CardDescription>
    </CardHeader>
    <CardContent>
      {{
        new Date(tournament.event_date).toLocaleDateString('ru-RU', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }}
    </CardContent>
  </Card>
</template>
