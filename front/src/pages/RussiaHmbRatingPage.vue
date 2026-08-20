<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useTranslation } from 'i18next-vue'
import type { Nomination, RussiaHmbLeaderboardRow } from '@/model'
import { tData } from '@/lib/utils'
import { useRussiaHmbRatingPageData } from '@/composables/useRussiaHmbRatingPageData'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

type Language = 'ru' | 'en'

const { i18next } = useTranslation()
const currentLanguage = ref<Language>(i18next.language === 'en' ? 'en' : 'ru')
const {
  years,
  nominations,
  selectedYear,
  selectedNominationId,
  ratings,
  isLoading,
  errorMessage,
  hasYears,
  hasNominations,
  loadYears
} = useRussiaHmbRatingPageData()

const isPresentString = (value: string | null | undefined): value is string => Boolean(value)
const nominationName = (nomination: Nomination) => nomination[`name_${currentLanguage.value}`]

const fighterName = (rating: RussiaHmbLeaderboardRow) => {
  const { fighter } = rating
  return [fighter.surname, fighter.name, fighter.patronymic]
    .filter(isPresentString)
    .map((part) => tData(part, currentLanguage.value))
    .join(' ')
}

const fighterLocation = (rating: RussiaHmbLeaderboardRow) => {
  const { fighter } = rating
  return [fighter.country.name, fighter.city.name, fighter.club?.name]
    .filter(isPresentString)
    .map((part) => tData(part, currentLanguage.value))
    .join(', ')
}

const updateLanguage = (language: string) => {
  currentLanguage.value = language === 'en' ? 'en' : 'ru'
}

onMounted(async () => {
  i18next.on('languageChanged', updateLanguage)
  await loadYears()
})

onUnmounted(() => {
  i18next.off('languageChanged', updateLanguage)
})
</script>

<template>
  <main class="w-full px-4 pt-4">
    <div class="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 class="text-2xl font-semibold">{{ $t('russiaHmbRatingPageTitle') }}</h1>
        <div v-if="hasYears" class="flex flex-col gap-3 md:flex-row">
          <NativeSelect
            v-model="selectedYear"
            class="w-full md:w-36"
            :aria-label="$t('russiaHmbRatingPageYear')"
          >
            <NativeSelectOption v-for="year in years" :key="year" :value="String(year)">
              {{ year }}
            </NativeSelectOption>
          </NativeSelect>
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
      </div>

      <p v-if="errorMessage" class="text-sm text-destructive">{{ errorMessage }}</p>

      <div v-if="!hasYears && !errorMessage" class="py-12 text-center text-muted-foreground">
        {{ $t('ratingPageEmpty') }}
      </div>

      <div
        v-else
        class="h-[calc(100vh-180px)] overflow-hidden rounded-md border [&_[data-slot=table-container]]:h-full"
      >
        <Table class="md:min-w-2xl">
          <TableHeader class="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead class="w-px md:w-20">{{ $t('ratingPageRank') }}</TableHead>
              <TableHead>{{ $t('ratingPageFighter') }}</TableHead>
              <TableHead class="hidden md:table-cell">{{ $t('ratingPageLocation') }}</TableHead>
              <TableHead class="w-px text-right md:w-28">
                {{ $t('russiaHmbRatingPageTournaments') }}
              </TableHead>
              <TableHead class="w-px text-right md:w-28">{{ $t('ratingPageRating') }}</TableHead>
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
              <TableRow v-for="(rating, index) in ratings" :key="rating.fighter_id">
                <TableCell class="w-px font-medium md:w-20">{{ index + 1 }}</TableCell>
                <TableCell class="whitespace-normal md:whitespace-nowrap">
                  {{ fighterName(rating) }}
                </TableCell>
                <TableCell class="hidden md:table-cell">{{ fighterLocation(rating) }}</TableCell>
                <TableCell class="w-px text-right md:w-28">
                  {{ rating.tournaments_count }}
                </TableCell>
                <TableCell class="w-px text-right font-semibold md:w-28">
                  {{ rating.points }}
                </TableCell>
              </TableRow>
            </template>
          </TableBody>
        </Table>
      </div>
    </div>
  </main>
</template>
