import type { Fighter, GroupFighter, Group } from '@/model'

const getGroupLetter = (index: number) => String.fromCharCode(65 + index)

const createGroupFighter = (fighter: Fighter): GroupFighter => ({
  ...fighter,
  wins: 0,
  diff: 0
})

export const generateGroups = (fighters: Fighter[], index: number): Group[] => {
  const groupFighters = fighters.map((fighter) => createGroupFighter(fighter))
  const total = groupFighters.length

  if (total === 0) return []
  if (total < 4) return [{ letter: getGroupLetter(index), fighters: [...groupFighters] }]

  // 1. Перемешиваем исходный массив (Алгоритм Фишера — Йейтса)
  const shuffled = [...groupFighters]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  // 2. Расчет оптимального количества групп
  let groupCount = Math.round(total / 4)
  if (groupCount < 1) groupCount = 1
  if (groupCount > 16) groupCount = 16
  if (total / groupCount < 3) groupCount = Math.floor(total / 3)
  if (groupCount > 2 && groupCount % 2 !== 0 && total / (groupCount - 1) <= 6) {
    groupCount--
  }

  const groups: GroupFighter[][] = Array.from({ length: groupCount }, () => [])

  // 3. Группируем по "весу" (клуб или город)
  const clusters: Record<string, GroupFighter[]> = {}
  shuffled.forEach((f) => {
    const key = f.club ? `club:${f.club}` : `city:${f.city}`
    if (!clusters[key]) clusters[key] = []
    clusters[key].push(f)
  })

  // Сортируем кластеры по убыванию размера, чтобы сначала распределить большие группы
  const sortedClusters = Object.values(clusters).sort((a, b) => b.length - a.length)
  const flatFighters = sortedClusters.flat()

  // 4. Распределение с балансировкой
  flatFighters.forEach((fighter) => {
    const bestGroup = groups
      .map((group, index) => ({
        index,
        size: group.length,
        clubCount: group.filter((g) => g.club && g.club === fighter.club).length,
        cityCount: group.filter((g) => g.city === fighter.city).length
      }))
      .sort((a, b) => {
        // Условие 1: Сначала наполняем самые пустые группы (разница не более 1)
        if (a.size !== b.size) return a.size - b.size
        // Условие 2: Минимум соклубников
        if (a.clubCount !== b.clubCount) return a.clubCount - b.clubCount
        // Условие 3: Минимум земляков
        return a.cityCount - b.cityCount
      })[0] // Берем самый подходящий вариант

    groups[bestGroup.index].push(fighter)
  })

  return groups.map((fighters, idx) => ({ letter: getGroupLetter(index + idx), fighters }))
}
