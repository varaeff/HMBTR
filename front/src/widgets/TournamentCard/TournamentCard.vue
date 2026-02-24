<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useTranslation } from 'i18next-vue'
import { useCommonDataStore } from '@/stores/commonData'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { dateToString, tData } from '@/lib/utils'
import type { Tournament, Nomination } from '@/model'

const props = defineProps<{
  tournament: Tournament
}>()

const commonDataStore = useCommonDataStore()
const nominations = ref<Nomination[]>([])
const { i18next } = useTranslation()

onMounted(async () => {
  nominations.value = await commonDataStore.fetchNominations().then((data) => {
    return data.filter((nom: Nomination) => props.tournament.nominations_ids.includes(nom.id))
  })
})

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
    <CardContent class="flex flex-col gap-2">
      {{ dateToString(props.tournament.event_date) }}
      <div v-if="props.tournament.nominations_ids.length" class="flex flex-wrap items-center gap-2">
        <Badge v-for="nom in nominations" :key="nom.id" variant="default">
          {{ nom[`name_${i18next.language as 'ru' | 'en'}`] }}
        </Badge>
      </div>
    </CardContent>
  </Card>
</template>
