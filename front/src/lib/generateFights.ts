import type { Group, GroupFighter, FightData, BlockData } from '@/model'

const generateRoundRobin = (participants: GroupFighter[]): [GroupFighter, GroupFighter][] => {
  const p = [...participants]
  if (p.length < 2) return []

  const isOdd = p.length % 2 !== 0
  const placeholder = null
  const extendedParticipants: (GroupFighter | null)[] = isOdd ? [...p, placeholder] : p
  const rounds: [GroupFighter, GroupFighter][] = []
  const n = extendedParticipants.length

  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n / 2; i++) {
      const p1 = extendedParticipants[i]
      const p2 = extendedParticipants[n - 1 - i]

      if (p1 !== null && p2 !== null) {
        rounds.push([p1, p2])
      }
    }
    // Вращение
    const shifted = extendedParticipants.splice(1, 1)
    extendedParticipants.push(shifted[0])
  }
  return rounds
}

export const stageGroupFights = (groups: Group[]): BlockData[] => {
  const blocks: BlockData[] = []
  let globalFightCounter = 1 // Общий счетчик боев для поля number

  for (let i = 0; i < groups.length; i += 2) {
    const group1 = groups[i]
    const group2 = groups[i + 1]

    const schedule1 = generateRoundRobin(group1.fighters)
    const schedule2 = group2 ? generateRoundRobin(group2.fighters) : []

    const blockFights: FightData[] = []
    const maxLength = Math.max(schedule1.length, schedule2.length)

    for (let round = 0; round < maxLength; round++) {
      // Обработка боя из первой группы
      if (schedule1[round]) {
        const [f1, f2] = schedule1[round]
        blockFights.push({
          number: globalFightCounter++,
          fighter1: f1,
          fighter2: f2,
          fighter1Score: 0,
          fighter2Score: 0
        })
      }
      // Обработка боя из второй группы
      if (schedule2[round]) {
        const [f1, f2] = schedule2[round]
        blockFights.push({
          number: globalFightCounter++,
          fighter1: f1,
          fighter2: f2,
          fighter1Score: 0,
          fighter2Score: 0
        })
      }
    }

    const letters = [group1.letter]
    if (group2) letters.push(group2.letter)

    blocks.push({
      letters,
      fights: blockFights
    })
  }

  return blocks
}
