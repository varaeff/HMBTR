export const MAX_ROUND_TIME_SECONDS = 3_599

const twoDigit = (value: number) => String(value).padStart(2, '0')

export const clampRoundTimeSeconds = (value: number) =>
  Math.min(MAX_ROUND_TIME_SECONDS, Math.max(0, Math.trunc(value)))

export const formatRoundTime = (seconds: number) => {
  const normalized = clampRoundTimeSeconds(seconds)
  const minutes = Math.floor(normalized / 60)
  const remainingSeconds = normalized % 60

  return `${twoDigit(minutes)}:${twoDigit(remainingSeconds)}`
}

export const parseRoundTime = (value: string) => {
  const [minutesText = '0', secondsText = '0'] = value.split(':')
  const minutes = Number.parseInt(minutesText, 10)
  const seconds = Number.parseInt(secondsText, 10)

  if (
    !Number.isSafeInteger(minutes) ||
    !Number.isSafeInteger(seconds) ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null
  }

  return minutes * 60 + seconds
}
