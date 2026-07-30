import { reactive, type Ref } from 'vue'
import type { CompetitionBlock } from '@/model'

export const useTournamentBlockOpenState = (
  tournamentId: Ref<number>,
  activeTab: Ref<number>
) => {
  const blockOpenStates = reactive<Record<string, boolean>>({})

  const blockStorageKey = (block: CompetitionBlock) =>
    `HMBTR-collapsible-competition-block-${tournamentId.value}-${activeTab.value}-${block.id}`

  const getBlockIsOpen = (block: CompetitionBlock) => {
    const key = blockStorageKey(block)

    if (!(key in blockOpenStates)) {
      const stored = localStorage.getItem(key)
      blockOpenStates[key] = stored === null ? true : stored === 'true'
    }

    return blockOpenStates[key]
  }

  const setBlockIsOpen = (block: CompetitionBlock, isOpen: boolean) => {
    const key = blockStorageKey(block)
    blockOpenStates[key] = isOpen
    localStorage.setItem(key, String(isOpen))
  }

  return {
    getBlockIsOpen,
    setBlockIsOpen
  }
}
