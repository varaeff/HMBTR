import { tData } from '@/lib/utils'
import type { ActiveDisciplinaryCardSummary } from '@/model/disciplinaryCards'

type Translate = (key: string) => string

export const formatDisciplinaryCardReason = (
  reason: string,
  translate: Translate
) => {
  const translationKey = `disciplinaryCardsReason${reason}`
  const translated = translate(translationKey)

  return translated === translationKey ? reason : translated
}

export const formatActiveDisciplinaryCardTitle = (
  card: ActiveDisciplinaryCardSummary,
  language: string,
  translate: Translate
) =>
  `${tData(card.tournament_name, language)}: ${formatDisciplinaryCardReason(
    card.reason,
    translate
  )}`
