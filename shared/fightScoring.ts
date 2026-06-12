export const MAX_SCORE = 2_147_483_647

export type WinnerSide = 1 | 2 | null

export interface RoundScore {
  competitor1Score: number
  competitor2Score: number
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

const isValidScore = (score: number) =>
  Number.isSafeInteger(score) && score >= 0 && score <= MAX_SCORE

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
