import { ref } from 'vue'
import { fetchTournamentMarshalsByTournament } from '@/api/tournamentMarshals'
import type { DisciplinaryCard } from '@/model/disciplinaryCards'
import type { TournamentMarshal } from '@/model/marshal'

export const useFighterCardMarshals = () => {
  const tournamentMarshalsByTournamentId = ref<Record<number, TournamentMarshal[]>>({})

  const loadCardTournamentMarshals = async (cards: DisciplinaryCard[]) => {
    const tournamentIds = [...new Set(cards.map((card) => card.tournament_id))].filter(
      (tournamentId) => !tournamentMarshalsByTournamentId.value[tournamentId]
    )

    const entries = await Promise.all(
      tournamentIds.map(async (tournamentId) => {
        const marshals = await fetchTournamentMarshalsByTournament(tournamentId)

        return [tournamentId, marshals] as const
      })
    )

    tournamentMarshalsByTournamentId.value = {
      ...tournamentMarshalsByTournamentId.value,
      ...Object.fromEntries(entries)
    }
  }

  return {
    tournamentMarshalsByTournamentId,
    loadCardTournamentMarshals
  }
}
