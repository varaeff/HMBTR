import { computed, ref, watch } from 'vue'
import { useTranslation } from 'i18next-vue'
import {
  fetchRussiaHmbLeaderboard,
  fetchRussiaHmbNominationsByYear,
  fetchRussiaHmbYears
} from '@/api/ratings'
import type { Nomination } from '@/model/nomination'
import type { RussiaHmbLeaderboardRow } from '@/model/rating'

const defaultYear = (years: number[]) => {
  const currentYear = new Date().getFullYear()
  if (years.includes(currentYear)) return String(currentYear)
  return years[0] ? String(years[0]) : ''
}

export const useRussiaHmbRatingPageData = () => {
  const { i18next } = useTranslation()
  const years = ref<number[]>([])
  const nominations = ref<Nomination[]>([])
  const selectedYear = ref('')
  const selectedNominationId = ref('')
  const ratings = ref<RussiaHmbLeaderboardRow[]>([])
  const isLoading = ref(false)
  const errorMessage = ref('')

  const hasYears = computed(() => years.value.length > 0)
  const hasNominations = computed(() => nominations.value.length > 0)

  const loadYears = async () => {
    try {
      years.value = await fetchRussiaHmbYears()
      selectedYear.value = defaultYear(years.value)
    } catch (error: unknown) {
      errorMessage.value = error instanceof Error ? error.message : i18next.t('ratingPageLoadError')
      years.value = []
      selectedYear.value = ''
    }
  }

  const loadNominations = async () => {
    if (!selectedYear.value) {
      nominations.value = []
      selectedNominationId.value = ''
      return
    }

    nominations.value = await fetchRussiaHmbNominationsByYear(selectedYear.value)
    selectedNominationId.value = nominations.value[0] ? String(nominations.value[0].id) : ''
  }

  const loadRatings = async () => {
    if (!selectedYear.value || !selectedNominationId.value) {
      ratings.value = []
      return
    }

    isLoading.value = true
    errorMessage.value = ''

    try {
      ratings.value = await fetchRussiaHmbLeaderboard(
        selectedYear.value,
        selectedNominationId.value
      )
    } catch (error: unknown) {
      errorMessage.value = error instanceof Error ? error.message : i18next.t('ratingPageLoadError')
      ratings.value = []
    } finally {
      isLoading.value = false
    }
  }

  watch(selectedYear, async () => {
    try {
      await loadNominations()
    } catch (error: unknown) {
      errorMessage.value = error instanceof Error ? error.message : i18next.t('ratingPageLoadError')
      nominations.value = []
      selectedNominationId.value = ''
    }
  })

  watch(selectedNominationId, () => {
    void loadRatings()
  })

  return {
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
  }
}
