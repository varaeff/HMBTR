import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useTranslation } from 'i18next-vue'
import { fetchFighterEloRatings, fetchFighterProfileStats } from '@/api/ratings'
import { useAuthStore } from '@/stores/auth'
import type {
  FighterProfileNomination,
  FighterProfileStats,
  FighterRatingSummary
} from '@/model/rating'

export interface CompletedTournamentNominationRow {
  nomination: FighterProfileNomination
  russiaHmbRatingPoints: number | null
}

export interface CompletedTournamentRow {
  tournament_id: number
  tournament_name: string
  event_date: string | null
  nominations: CompletedTournamentNominationRow[]
}

type FighterIdRef = Ref<string | number> | ComputedRef<string | number>

const defaultYear = (years: number[]) => {
  const currentYear = new Date().getFullYear()
  if (years.includes(currentYear)) return currentYear
  return years[0] ?? ''
}

export const useFighterProfileStats = (fighterId: FighterIdRef) => {
  const { i18next } = useTranslation()
  const authStore = useAuthStore()
  const fighterStats = ref<FighterProfileStats | null>(null)
  const isStatsLoading = ref(false)
  const statsError = ref('')
  const selectedRatingNominationId = ref('')
  const selectedRussiaHmbYear = ref('')

  const completedTournamentRows = computed<CompletedTournamentRow[]>(() => {
    if (!fighterStats.value) return []

    return fighterStats.value.tournaments.map((item) => ({
      tournament_id: item.tournament_id,
      tournament_name: item.tournament_name,
      event_date: item.event_date,
      nominations: item.nominations.map((nomination) => ({
        nomination: nomination.nomination,
        russiaHmbRatingPoints: nomination.russia_hmb_rating_points
      }))
    }))
  })

  const selectedRating = computed<FighterRatingSummary | undefined>(() => {
    if (!fighterStats.value) return undefined

    return fighterStats.value.ratings.find(
      (rating) => String(rating.nomination.id) === selectedRatingNominationId.value
    )
  })

  const russiaHmbYears = computed(() =>
    (fighterStats.value?.russia_hmb_ratings ?? []).map((summary) => summary.year)
  )

  const selectedRussiaHmbSummary = computed(() => {
    if (!fighterStats.value) return undefined

    return fighterStats.value.russia_hmb_ratings.find(
      (summary) => String(summary.year) === selectedRussiaHmbYear.value
    )
  })

  const loadFighterStats = async () => {
    isStatsLoading.value = true
    statsError.value = ''

    try {
      const data = await fetchFighterProfileStats(fighterId.value)

      if (authStore.hasAnyRole) {
        data.ratings = await fetchFighterEloRatings(fighterId.value)
      }

      fighterStats.value = data
      selectedRatingNominationId.value = data.ratings[0] ? String(data.ratings[0].nomination.id) : ''
      selectedRussiaHmbYear.value = String(defaultYear(russiaHmbYears.value))
    } catch (error: unknown) {
      statsError.value =
        error instanceof Error ? error.message : i18next.t('fighterPageStatsLoadError')
      fighterStats.value = null
    } finally {
      isStatsLoading.value = false
    }
  }

  return {
    fighterStats,
    isStatsLoading,
    statsError,
    selectedRatingNominationId,
    selectedRussiaHmbYear,
    russiaHmbYears,
    selectedRussiaHmbSummary,
    completedTournamentRows,
    selectedRating,
    loadFighterStats
  }
}
