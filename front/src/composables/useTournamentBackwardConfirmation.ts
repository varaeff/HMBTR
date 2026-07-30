import { ref } from 'vue'

export interface TournamentBackwardConfirmation {
  mainText: string
  action: () => Promise<void>
}

export const useTournamentBackwardConfirmation = () => {
  const confirmation = ref<TournamentBackwardConfirmation | null>(null)

  const close = () => {
    confirmation.value = null
  }

  const request = (mainText: string, action: () => Promise<void>) => {
    confirmation.value = { mainText, action }
  }

  const runConfirmed = async () => {
    const action = confirmation.value?.action
    close()
    await action?.()
  }

  return {
    confirmation,
    close,
    request,
    runConfirmed
  }
}
