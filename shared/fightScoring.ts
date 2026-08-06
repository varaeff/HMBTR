export const MAX_SCORE = 2_147_483_647

export type WinnerSide = 1 | 2 | null

export interface RoundScore {
  competitor1Score: number
  competitor2Score: number
}

export interface FightWarning {
  competitorId: number
  round: number
  reason: string
}

export interface FightWarningContext {
  competitor1Id: number
  competitor2Id: number
  warnings: FightWarning[]
}

export interface FightScoringRules {
  rounds: 1 | 2 | 3
  roundWin: boolean
}

export interface FightScoreEvaluation {
  competitor1Total: number
  competitor2Total: number
  competitor1RoundWins: number
  competitor2RoundWins: number
  winnerSide: WinnerSide
  requiresTieBreakRound: boolean
  isValidDraft: boolean
  isValidResult: boolean
  error: string | null
}

export interface WarningScorePart {
  competitor1Score: number
  competitor2Score: number
  competitor1Bonus: number
  competitor2Bonus: number
}

export interface WarningAdjustedScore {
  aggregateScore: RoundScore
  roundScores: RoundScore[]
  scoreParts: WarningScorePart[]
  technicalLoserSide: WinnerSide
}

export const WARNING_SCORE_BONUS = 3
export const MAX_FIGHT_WARNINGS_PER_COMPETITOR = 3

const isValidScore = (score: number) =>
  Number.isSafeInteger(score) && score >= 0 && score <= MAX_SCORE

export const getFightWarningCount = (
  warnings: FightWarning[],
  competitorId: number
) => warnings.filter((warning) => warning.competitorId === competitorId).length

export const getFightWarningTechnicalLoserSide = ({
  competitor1Id,
  competitor2Id,
  warnings
}: FightWarningContext): WinnerSide => {
  const competitor1Warnings = getFightWarningCount(warnings, competitor1Id)
  const competitor2Warnings = getFightWarningCount(warnings, competitor2Id)

  if (
    competitor1Warnings >= MAX_FIGHT_WARNINGS_PER_COMPETITOR &&
    competitor2Warnings < MAX_FIGHT_WARNINGS_PER_COMPETITOR
  ) {
    return 1
  }

  if (
    competitor2Warnings >= MAX_FIGHT_WARNINGS_PER_COMPETITOR &&
    competitor1Warnings < MAX_FIGHT_WARNINGS_PER_COMPETITOR
  ) {
    return 2
  }

  return null
}

export const getTechnicalDefeatScore = (
  rules: FightScoringRules,
  loserSide: 1 | 2
): { aggregateScore: RoundScore; roundScores: RoundScore[] } => {
  const winnerScore = rules.roundWin ? rules.rounds : 10
  const winnerRoundScore = rules.roundWin ? 5 : 0
  const winnerIsFirst = loserSide === 2
  const roundScores = Array.from({ length: rules.rounds }, (_, index) => ({
    competitor1Score:
      (rules.roundWin || index === 0) && winnerIsFirst
        ? winnerRoundScore || winnerScore
        : 0,
    competitor2Score:
      (rules.roundWin || index === 0) && !winnerIsFirst
        ? winnerRoundScore || winnerScore
        : 0
  }))

  return {
    aggregateScore: {
      competitor1Score: winnerIsFirst ? winnerScore : 0,
      competitor2Score: winnerIsFirst ? 0 : winnerScore
    },
    roundScores
  }
}

export const applyFightWarningBonuses = (
  rules: FightScoringRules,
  warningContext: FightWarningContext,
  roundScores: RoundScore[]
): WarningAdjustedScore => {
  const technicalLoserSide = getFightWarningTechnicalLoserSide(warningContext)

  if (technicalLoserSide) {
    const technicalScore = getTechnicalDefeatScore(rules, technicalLoserSide)
    return {
      aggregateScore: technicalScore.aggregateScore,
      roundScores: technicalScore.roundScores,
      scoreParts: technicalScore.roundScores.map((score) => ({
        ...score,
        competitor1Bonus: 0,
        competitor2Bonus: 0
      })),
      technicalLoserSide
    }
  }

  const scoreParts = roundScores.map((score, index) => {
    const round = index + 1
    return {
      competitor1Score: score.competitor1Score,
      competitor2Score: score.competitor2Score,
      competitor1Bonus:
        warningContext.warnings.filter(
          (warning) =>
            warning.competitorId === warningContext.competitor2Id &&
            warning.round === round
        ).length * WARNING_SCORE_BONUS,
      competitor2Bonus:
        warningContext.warnings.filter(
          (warning) =>
            warning.competitorId === warningContext.competitor1Id &&
            warning.round === round
        ).length * WARNING_SCORE_BONUS
    }
  })

  const adjustedRounds = scoreParts.map((score) => ({
    competitor1Score: score.competitor1Score + score.competitor1Bonus,
    competitor2Score: score.competitor2Score + score.competitor2Bonus
  }))
  const aggregateScore = adjustedRounds.reduce(
    (sum, score) => ({
      competitor1Score: sum.competitor1Score + score.competitor1Score,
      competitor2Score: sum.competitor2Score + score.competitor2Score
    }),
    { competitor1Score: 0, competitor2Score: 0 }
  )

  return {
    aggregateScore,
    roundScores: adjustedRounds,
    scoreParts,
    technicalLoserSide
  }
}

export const evaluateFightScore = (
  rules: FightScoringRules,
  roundScores: RoundScore[]
): FightScoreEvaluation => {
  const invalid = (error: string): FightScoreEvaluation => ({
    competitor1Total: 0,
    competitor2Total: 0,
    competitor1RoundWins: 0,
    competitor2RoundWins: 0,
    winnerSide: null,
    requiresTieBreakRound: false,
    isValidDraft: false,
    isValidResult: false,
    error
  })

  if (
    ![1, 2, 3].includes(rules.rounds) ||
    (rules.roundWin && rules.rounds !== 3)
  ) {
    return invalid('Invalid nomination scoring configuration')
  }

  if (roundScores.length < rules.rounds) {
    return invalid(`Expected at least ${rules.rounds} round scores`)
  }
  if (
    roundScores.some(
      (score) =>
        !isValidScore(score.competitor1Score) ||
        !isValidScore(score.competitor2Score)
    )
  ) {
    return invalid('Scores must be non-negative 32-bit integers')
  }

  const totals = roundScores.reduce(
    (sum, score) => [
      sum[0] + score.competitor1Score,
      sum[1] + score.competitor2Score
    ],
    [0, 0]
  )
  if (totals[0] > MAX_SCORE || totals[1] > MAX_SCORE) {
    return invalid('Aggregate score exceeds the 32-bit integer limit')
  }

  const countRoundWins = (scores: RoundScore[]) =>
    scores.reduce(
      (wins, score) => {
        if (score.competitor1Score > score.competitor2Score) wins[0]++
        if (score.competitor2Score > score.competitor1Score) wins[1]++
        return wins
      },
      [0, 0]
    )

  const winnerFromComparison = (
    competitor1Value: number,
    competitor2Value: number
  ): WinnerSide =>
    competitor1Value === competitor2Value
      ? null
      : competitor1Value > competitor2Value
        ? 1
        : 2

  const normalRounds = roundScores.slice(0, rules.rounds)
  const extraRounds = roundScores.slice(rules.rounds)
  const normalRoundWins = countRoundWins(normalRounds)
  const normalWinnerSide: WinnerSide = rules.roundWin
    ? winnerFromComparison(normalRoundWins[0], normalRoundWins[1])
    : winnerFromComparison(
        normalRounds.reduce((sum, score) => sum + score.competitor1Score, 0),
        normalRounds.reduce((sum, score) => sum + score.competitor2Score, 0)
      )

  if (normalWinnerSide && extraRounds.length > 0) {
    return invalid('Extra round is not required')
  }

  let decisiveExtraRoundIndex = -1
  for (let index = 0; index < extraRounds.length; index++) {
    const score = extraRounds[index]
    if (score.competitor1Score !== score.competitor2Score) {
      decisiveExtraRoundIndex = index
      break
    }
  }

  if (
    decisiveExtraRoundIndex !== -1 &&
    decisiveExtraRoundIndex < extraRounds.length - 1
  ) {
    return invalid('Extra round is not required')
  }

  const allRoundWins = countRoundWins(roundScores)
  const winnerSide: WinnerSide = rules.roundWin
    ? winnerFromComparison(allRoundWins[0], allRoundWins[1])
    : winnerFromComparison(totals[0], totals[1])
  const requiresTieBreakRound = winnerSide === null

  return {
    competitor1Total: totals[0],
    competitor2Total: totals[1],
    competitor1RoundWins: allRoundWins[0],
    competitor2RoundWins: allRoundWins[1],
    winnerSide,
    requiresTieBreakRound,
    isValidDraft: true,
    isValidResult: winnerSide !== null,
    error:
      winnerSide === null ? 'Every recorded fight must have a winner' : null
  }
}

export const getRequiredRoundScores = (
  rules: FightScoringRules,
  roundScores: RoundScore[]
): RoundScore[] => {
  const baseRounds = roundScores.slice(0, rules.rounds)
  if (baseRounds.length < rules.rounds) return baseRounds

  const baseEvaluation = evaluateFightScore(rules, baseRounds)
  if (!baseEvaluation.requiresTieBreakRound) return baseRounds

  const requiredRounds = [...baseRounds]
  for (const extraRound of roundScores.slice(rules.rounds)) {
    requiredRounds.push(extraRound)
    if (extraRound.competitor1Score !== extraRound.competitor2Score) break
  }

  return requiredRounds
}

export const getInitialRoundScores = (rules: FightScoringRules) =>
  Array.from({ length: rules.rounds }, () => ({
    competitor1Score: 0,
    competitor2Score: 0
  }))

export const hasRoundScoreValue = (score: RoundScore) =>
  score.competitor1Score !== 0 || score.competitor2Score !== 0

/*
 * The formatter keeps the old compact one-round display for base-only fights,
 * but shows a breakdown when a one-round fight needed extra rounds.
 */
export const shouldFormatRoundBreakdown = (
  rules: FightScoringRules,
  roundScores: RoundScore[],
  isForfeit: boolean
) => {
  if (isForfeit && !rules.roundWin) return false
  return rules.rounds > 1 || roundScores.length > 1
}

export const formatFightResult = (
  rules: FightScoringRules,
  evaluation: FightScoreEvaluation,
  roundScores: RoundScore[],
  isForfeit = false
) => {
  if (!shouldFormatRoundBreakdown(rules, roundScores, isForfeit)) {
    return `${evaluation.competitor1Total}:${evaluation.competitor2Total}`
  }

  const leadingScore = rules.roundWin
    ? `${evaluation.competitor1RoundWins}:${evaluation.competitor2RoundWins}`
    : `${evaluation.competitor1Total}:${evaluation.competitor2Total}`
  const breakdown = roundScores
    .map((score) => `${score.competitor1Score}:${score.competitor2Score}`)
    .join(', ')

  return `${leadingScore} (${breakdown})`
}
