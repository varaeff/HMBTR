import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useTranslation } from 'i18next-vue'
import { fetchFighterProfileStats } from '@/api/ratings'
import type {
  FighterProfileNomination,
  FighterProfileStats,
  FighterRatingSummary
} from '@/model/rating'

export interface CompletedTournamentRow {
  tournament_id: number
  tournament_name: string
  event_date: string | null
  nominations: FighterProfileNomination[]
}

type FighterIdRef = Ref<string | number> | ComputedRef<string | number>

export const useFighterProfileStats = (fighterId: FighterIdRef) => {
  const { i18next } = useTranslation()
  const fighterStats = ref<FighterProfileStats | null>(null)
  const isStatsLoading = ref(false)
  const statsError = ref('')
  const selectedRatingNominationId = ref('')

  const completedTournamentRows = computed<CompletedTournamentRow[]>(() => {
    if (!fighterStats.value) return []

    const rows = new Map<number, CompletedTournamentRow>()

    for (const item of fighterStats.value.tournaments) {
      const row = rows.get(item.tournament_id)

      if (row) {
        if (!row.nominations.some((nomination) => nomination.id === item.nomination.id)) {
          row.nominations.push(item.nomination)
        }
        continue
      }

      rows.set(item.tournament_id, {
        tournament_id: item.tournament_id,
        tournament_name: item.tournament_name,
        event_date: item.event_date,
        nominations: [item.nomination]
      })
    }

    return [...rows.values()]
  })

  const selectedRating = computed<FighterRatingSummary | undefined>(() => {
    if (!fighterStats.value) return undefined

    return fighterStats.value.ratings.find(
      (rating) => String(rating.nomination.id) === selectedRatingNominationId.value
    )
  })

  const loadFighterStats = async () => {
    isStatsLoading.value = true
    statsError.value = ''

    try {
      const data = await fetchFighterProfileStats(fighterId.value)
      fighterStats.value = data
      selectedRatingNominationId.value = data.ratings[0] ? String(data.ratings[0].nomination.id) : ''
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
    completedTournamentRows,
    selectedRating,
    loadFighterStats
  }
}
