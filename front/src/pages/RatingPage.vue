<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useTranslation } from 'i18next-vue'
import http from '@/api/http'
import { API_ROUTES } from '@shared/routes'
import type { FighterNominationRating, Nomination } from '@/model'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'

type Language = 'ru' | 'en'

const { i18next } = useTranslation()
const nominations = ref<Nomination[]>([])
const selectedNominationId = ref('')
const ratings = ref<FighterNominationRating[]>([])
const isLoading = ref(false)
const errorMessage = ref('')

const currentLanguage = computed<Language>(() => (i18next.language === 'en' ? 'en' : 'ru'))
const hasNominations = computed(() => nominations.value.length > 0)

const nominationName = (nomination: Nomination) => nomination[`name_${currentLanguage.value}`]

const fighterName = (rating: FighterNominationRating) => {
  const { fighter } = rating
  return [fighter.surname, fighter.name, fighter.patronymic].filter(Boolean).join(' ')
}

const fighterLocation = (rating: FighterNominationRating) => {
  const { fighter } = rating
  return [fighter.country.name, fighter.city.name, fighter.club?.name].filter(Boolean).join(', ')
}

const fetchNominations = async () => {
  const response = await http.get(API_ROUTES.RATINGS.ROOT)
  nominations.value = response.data as Nomination[]
  selectedNominationId.value = nominations.value[0] ? String(nominations.value[0].id) : ''
}

const fetchRatings = async () => {
  if (!selectedNominationId.value) {
    ratings.value = []
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await http.get(API_ROUTES.RATINGS.BY_NOMINATION(selectedNominationId.value))
    ratings.value = response.data as FighterNominationRating[]
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : i18next.t('ratingPageLoadError')
    ratings.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  try {
    await fetchNominations()
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : i18next.t('ratingPageLoadError')
  }
})

watch(selectedNominationId, () => {
  void fetchRatings()
})
</script>

<template>
  <main class="w-full px-4 pt-4">
    <div class="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 class="text-2xl font-semibold">{{ $t('ratingPageTitle') }}</h1>
        <NativeSelect
          v-if="hasNominations"
          v-model="selectedNominationId"
          class="w-full md:w-80"
          :aria-label="$t('ratingPageNomination')"
        >
          <NativeSelectOption
            v-for="nomination in nominations"
            :key="nomination.id"
            :value="String(nomination.id)"
          >
            {{ nominationName(nomination) }}
          </NativeSelectOption>
        </NativeSelect>
      </div>

      <p v-if="errorMessage" class="text-sm text-destructive">{{ errorMessage }}</p>

      <div v-if="!hasNominations && !errorMessage" class="py-12 text-center text-muted-foreground">
        {{ $t('ratingPageEmpty') }}
      </div>

      <ScrollArea v-else class="h-[calc(100vh-180px)] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-20">{{ $t('ratingPageRank') }}</TableHead>
              <TableHead>{{ $t('ratingPageFighter') }}</TableHead>
              <TableHead>{{ $t('ratingPageLocation') }}</TableHead>
              <TableHead class="w-28 text-right">{{ $t('ratingPageFights') }}</TableHead>
              <TableHead class="w-28 text-right">{{ $t('ratingPageRating') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="isLoading">
              <TableCell colspan="5" class="h-24 text-center text-muted-foreground">
                {{ $t('ratingPageLoading') }}
              </TableCell>
            </TableRow>
            <TableRow v-else-if="ratings.length === 0">
              <TableCell colspan="5" class="h-24 text-center text-muted-foreground">
                {{ $t('ratingPageEmpty') }}
              </TableCell>
            </TableRow>
            <template v-else>
              <TableRow v-for="(rating, index) in ratings" :key="rating.id">
                <TableCell class="font-medium">{{ index + 1 }}</TableCell>
                <TableCell>{{ fighterName(rating) }}</TableCell>
                <TableCell>{{ fighterLocation(rating) }}</TableCell>
                <TableCell class="text-right">{{ rating.fights_count }}</TableCell>
                <TableCell class="text-right font-semibold">{{ rating.rating }}</TableCell>
              </TableRow>
            </template>
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  </main>
</template>
