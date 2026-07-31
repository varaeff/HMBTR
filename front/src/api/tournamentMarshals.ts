import http from '@/api/http'
import type { TournamentMarshal, TournamentMarshalDB } from '@/model/marshal'
import { parseTournamentMarshal } from '@/stores/marshalsList'
import { API_ROUTES } from '@shared/routes'

export const fetchTournamentMarshalsByTournament = async (
  tournamentId: string | number
): Promise<TournamentMarshal[]> => {
  const { data } = await http.get<TournamentMarshalDB[]>(
    API_ROUTES.TOURNAMENTS.MARSHALS_BY_TOURNAMENT(tournamentId)
  )

  return Promise.all(data.map((item) => parseTournamentMarshal(item)))
}
