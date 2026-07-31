import { computed, ref, watch } from 'vue'
import { useTranslation } from 'i18next-vue'
import { fetchRatingNominations, fetchRatingsByNomination } from '@/api/ratings'
import type { Nomination } from '@/model/nomination'
import type { FighterNominationRating } from '@/model/rating'

export const useRatingPageData = () => {
  const { i18next } = useTranslation()
  const nominations = ref<Nomination[]>([])
  const selectedNominationId = ref('')
  const ratings = ref<FighterNominationRating[]>([])
  const isLoading = ref(false)
  const errorMessage = ref('')

  const hasNominations = computed(() => nominations.value.length > 0)

  const loadNominations = async () => {
    try {
      nominations.value = await fetchRatingNominations()
      selectedNominationId.value = nominations.value[0] ? String(nominations.value[0].id) : ''
    } catch (error: unknown) {
      errorMessage.value = error instanceof Error ? error.message : i18next.t('ratingPageLoadError')
      nominations.value = []
      selectedNominationId.value = ''
    }
  }

  const loadRatings = async () => {
    if (!selectedNominationId.value) {
      ratings.value = []
      return
    }

    isLoading.value = true
    errorMessage.value = ''

    try {
      ratings.value = await fetchRatingsByNomination(selectedNominationId.value)
    } catch (error: unknown) {
      errorMessage.value = error instanceof Error ? error.message : i18next.t('ratingPageLoadError')
      ratings.value = []
    } finally {
      isLoading.value = false
    }
  }

  watch(selectedNominationId, () => {
    void loadRatings()
  })

  return {
    nominations,
    selectedNominationId,
    ratings,
    isLoading,
    errorMessage,
    hasNominations,
    loadNominations,
    loadRatings
  }
}
