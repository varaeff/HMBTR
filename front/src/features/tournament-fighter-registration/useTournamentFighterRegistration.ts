import { computed, onMounted, ref, watch, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCompetitionStore } from '@/stores/competition'
import { useFightersListStore } from '@/stores/fightersList'
import type { Fighter, FighterRegistrationEligibility, Nomination } from '@/model'

interface UseTournamentFighterRegistrationParams {
  tournamentId: Ref<number>
  nominations: Ref<Nomination[]>
}

interface FighterSelectOption {
  value: string
  label: string
}

export const useTournamentFighterRegistration = ({
  tournamentId,
  nominations
}: UseTournamentFighterRegistrationParams) => {
  const fightersListStore = useFightersListStore()
  const competitionStore = useCompetitionStore()
  const router = useRouter()
  const open = ref(false)
  const selectedFighter = ref('')
  const selectedNominationIds = ref<number[]>([])
  const registrationEligibility = ref<FighterRegistrationEligibility[]>([])
  let eligibilityLoadRequestId = 0

  const eligibilityByFighterId = computed(
    () =>
      new Map(
        registrationEligibility.value.map((eligibility) => [
          eligibility.fighter_id,
          new Set(eligibility.nomination_ids)
        ])
      )
  )

  const openNominationIds = computed(
    () => new Set(nominations.value.map((nomination) => nomination.id))
  )

  const selectedFighterData = computed(() =>
    fightersListStore.fightersList.find(
      (fighter) => fighter.id.toString() === selectedFighter.value
    )
  )

  const fighterOptions = computed<FighterSelectOption[]>(() => {
    const data: Fighter[] = fightersListStore.filteredFightersList
    return data
      .filter((fighter) =>
        [...(eligibilityByFighterId.value.get(fighter.id) ?? [])].some((nominationId) =>
          openNominationIds.value.has(nominationId)
        )
      )
      .map((fighter) => ({
        value: fighter.id.toString(),
        label: `${fighter.surname} ${fighter.name}, ${fighter.city} ${fighter.club || ''}`
      }))
  })

  const selectedFighterLabel = computed(
    () => fighterOptions.value.find((fighter) => fighter.value === selectedFighter.value)?.label ?? ''
  )

  const matchingNominations = computed(() => {
    if (!selectedFighterData.value) return []

    const availableNominationIds = eligibilityByFighterId.value.get(selectedFighterData.value.id)
    return nominations.value.filter((nomination) => availableNominationIds?.has(nomination.id))
  })

  const loadFighters = async () => {
    await fightersListStore.getFightersList()
  }

  const loadRegistrationEligibility = async () => {
    const requestId = ++eligibilityLoadRequestId
    const eligibility = await competitionStore.getRegistrationEligibility()

    if (requestId === eligibilityLoadRequestId) {
      registrationEligibility.value = eligibility
    }
  }

  const addFighter = () => {
    router.push(`/addFighter#${tournamentId.value.toString()}`)
  }

  const selectFighter = (fighterId: string) => {
    selectedFighter.value = fighterId
    selectedNominationIds.value = []
    open.value = false
  }

  const setNominationSelected = (nominationId: number, selected: boolean) => {
    selectedNominationIds.value = selected
      ? [...selectedNominationIds.value, nominationId]
      : selectedNominationIds.value.filter((id) => id !== nominationId)
  }

  const registerFighter = async () => {
    const fighterId = Number(selectedFighter.value)
    const registrationPromises = selectedNominationIds.value.map((nominationId) =>
      competitionStore.registerFighter(fighterId, nominationId)
    )

    await Promise.all(registrationPromises)
    await loadRegistrationEligibility()

    selectedFighter.value = ''
    selectedNominationIds.value = []
  }

  watch(
    () => nominations.value.map((nomination) => nomination.id).join('|'),
    loadRegistrationEligibility
  )

  watch(
    () =>
      competitionStore.tournamentCompetitors
        .map(
          (competitor) =>
            `${competitor.id}:${competitor.fighter_id}:${competitor.nomination_id}`
        )
        .join('|'),
    loadRegistrationEligibility
  )

  onMounted(async () => {
    fightersListStore.clearSearchString()
    competitionStore.setTournamentAndNomination(tournamentId.value, competitionStore.getNominationId)

    await Promise.all([
      loadFighters(),
      competitionStore.setCompetitors(),
      loadRegistrationEligibility()
    ])
  })

  return {
    open,
    selectedFighter,
    selectedNominationIds,
    fighterOptions,
    selectedFighterLabel,
    matchingNominations,
    addFighter,
    selectFighter,
    setNominationSelected,
    registerFighter
  }
}
