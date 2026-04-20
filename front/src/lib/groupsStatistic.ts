import type { Group, BlockData } from '@/model'

/**
 * Пересчитывает статистику побед и разницу очков для всех групп
 * на основе текущего состояния боев в блоках.
 */
export const updateGroupsStatistics = (groups: Group[], blocks: BlockData[]): void => {
  // 1. Сброс статистики перед полным пересчетом
  for (const group of groups) {
    for (const fighter of group.fighters) {
      fighter.wins = 0
      fighter.diff = 0
    }
  }

  // 2. Сбор всех боев из всех блоков в один плоский список
  const allFights = blocks.flatMap((block) => block.fights)

  // 3. Расчет очков
  for (const fight of allFights) {
    const { fighter1Score: s1, fighter2Score: s2, fighter1, fighter2 } = fight

    // Пропускаем бои без результата
    if (s1 === 0 && s2 === 0) continue

    // Ищем бойцов в структуре групп
    // Проходим по всем группам, так как бойцы из разных блоков могут быть в разных группах
    for (const group of groups) {
      const f1 = group.fighters.find((f) => f.id === fighter1.id)
      const f2 = group.fighters.find((f) => f.id === fighter2.id)

      if (f1) {
        f1.diff += s1 - s2
        if (s1 > s2) f1.wins += 1
      }

      if (f2) {
        f2.diff += s2 - s1
        if (s2 > s1) f2.wins += 1
      }
    }
  }

  // 4. Сортировка внутри каждой группы: Победы -> Разница очков
  for (const group of groups) {
    group.fighters.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      return b.diff - a.diff
    })
  }
}
