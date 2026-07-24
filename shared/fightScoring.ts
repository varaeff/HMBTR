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

export const getFightWarningCount = (warnings: FightWarning[], competitorId: number) =>
  warnings.filter((warning) => warning.competitorId === competitorId).length

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
  const roundScores = Array.from({ length: rules.rounds }, () => ({
    competitor1Score: rules.roundWin && winnerIsFirst ? winnerRoundScore : 0,
    competitor2Score: rules.roundWin && !winnerIsFirst ? winnerRoundScore : 0
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
  roundScores: RoundScore[],
  aggregateScores?: RoundScore
): WarningAdjustedScore => {
  const technicalLoserSide = getFightWarningTechnicalLoserSide(warningContext)

  if (technicalLoserSide) {
    const technicalScore = getTechnicalDefeatScore(rules, technicalLoserSide)
    const technicalScoreParts =
      rules.rounds === 1 ? [technicalScore.aggregateScore] : technicalScore.roundScores
    return {
      aggregateScore: technicalScore.aggregateScore,
      roundScores: technicalScore.roundScores,
      scoreParts: technicalScoreParts.map((score) => ({
        ...score,
        competitor1Bonus: 0,
        competitor2Bonus: 0
      })),
      technicalLoserSide
    }
  }

  const scoreParts =
    rules.rounds === 1
      ? [
          {
            competitor1Score: aggregateScores?.competitor1Score ?? 0,
            competitor2Score: aggregateScores?.competitor2Score ?? 0,
            competitor1Bonus:
              getFightWarningCount(warningContext.warnings, warningContext.competitor2Id) *
              WARNING_SCORE_BONUS,
            competitor2Bonus:
              getFightWarningCount(warningContext.warnings, warningContext.competitor1Id) *
              WARNING_SCORE_BONUS
          }
        ]
      : roundScores.map((score, index) => {
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
  const aggregateScore =
    rules.rounds === 1
      ? adjustedRounds[0]
      : adjustedRounds.reduce(
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
  roundScores: RoundScore[],
  aggregateScores?: RoundScore
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

  if (![1, 2, 3].includes(rules.rounds) || (rules.roundWin && rules.rounds !== 3)) {
    return invalid('Invalid nomination scoring configuration')
  }

  if (rules.rounds === 1) {
    if (!aggregateScores || roundScores.length > 0) {
      return invalid('Single-round fights require aggregate scores only')
    }
    if (
      !isValidScore(aggregateScores.competitor1Score) ||
      !isValidScore(aggregateScores.competitor2Score)
    ) {
      return invalid('Scores must be non-negative 32-bit integers')
    }

    const { competitor1Score, competitor2Score } = aggregateScores
    const winnerSide =
      competitor1Score === competitor2Score ? null : competitor1Score > competitor2Score ? 1 : 2

    return {
      competitor1Total: competitor1Score,
      competitor2Total: competitor2Score,
      competitor1RoundWins: winnerSide === 1 ? 1 : 0,
      competitor2RoundWins: winnerSide === 2 ? 1 : 0,
      winnerSide,
      requiresTieBreakRound: false,
      isValidDraft: true,
      isValidResult: winnerSide !== null,
      error: winnerSide === null ? 'Every recorded fight must have a winner' : null
    }
  }

  const allowedLengths = rules.roundWin ? [3, 4] : [rules.rounds]
  if (!allowedLengths.includes(roundScores.length)) {
    return invalid(`Expected ${rules.rounds} round scores${rules.roundWin ? ' or 4 with tie-break' : ''}`)
  }
  if (
    roundScores.some(
      (score) => !isValidScore(score.competitor1Score) || !isValidScore(score.competitor2Score)
    )
  ) {
    return invalid('Scores must be non-negative 32-bit integers')
  }

  const normalRounds = roundScores.slice(0, rules.rounds)
  const normalRoundWins = normalRounds.reduce(
    (wins, score) => {
      if (score.competitor1Score > score.competitor2Score) wins[0]++
      if (score.competitor2Score > score.competitor1Score) wins[1]++
      return wins
    },
    [0, 0]
  )
  const requiresTieBreakRound = rules.roundWin && normalRoundWins[0] === normalRoundWins[1]

  if (roundScores.length === 4 && !requiresTieBreakRound) {
    return invalid('Tie-break round is not required')
  }

  const totals = roundScores.reduce(
    (sum, score) => [sum[0] + score.competitor1Score, sum[1] + score.competitor2Score],
    [0, 0]
  )
  if (totals[0] > MAX_SCORE || totals[1] > MAX_SCORE) {
    return invalid('Aggregate score exceeds the 32-bit integer limit')
  }

  let competitor1RoundWins = normalRoundWins[0]
  let competitor2RoundWins = normalRoundWins[1]
  const tieBreak = roundScores[3]
  if (tieBreak?.competitor1Score > tieBreak?.competitor2Score) competitor1RoundWins++
  if (tieBreak?.competitor2Score > tieBreak?.competitor1Score) competitor2RoundWins++

  const winnerSide: WinnerSide = rules.roundWin
    ? competitor1RoundWins === competitor2RoundWins
      ? null
      : competitor1RoundWins > competitor2RoundWins
        ? 1
        : 2
    : totals[0] === totals[1]
      ? null
      : totals[0] > totals[1]
        ? 1
        : 2

  const tieBreakIsValid =
    !requiresTieBreakRound ||
    (roundScores.length === 4 && tieBreak.competitor1Score !== tieBreak.competitor2Score)

  return {
    competitor1Total: totals[0],
    competitor2Total: totals[1],
    competitor1RoundWins,
    competitor2RoundWins,
    winnerSide,
    requiresTieBreakRound,
    isValidDraft: true,
    isValidResult: winnerSide !== null && tieBreakIsValid,
    error:
      winnerSide === null || !tieBreakIsValid
        ? requiresTieBreakRound
          ? 'A non-draw tie-break round is required'
          : 'Every recorded fight must have a winner'
        : null
  }
}

export const formatFightResult = (
  rules: FightScoringRules,
  evaluation: FightScoreEvaluation,
  roundScores: RoundScore[],
  isForfeit = false
) => {
  if (rules.rounds === 1 || (isForfeit && !rules.roundWin)) {
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
