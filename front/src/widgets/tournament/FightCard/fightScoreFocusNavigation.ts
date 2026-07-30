const isElement = (target: EventTarget | null): target is HTMLElement => target instanceof HTMLElement

export const isScoreInputOutsideCurrentFight = (event: FocusEvent) => {
  const nextFocusedElement = event.relatedTarget
  if (
    !isElement(nextFocusedElement) ||
    nextFocusedElement.dataset.fightScoreInput !== 'true'
  ) {
    return false
  }

  const currentFightElement = isElement(event.target)
    ? event.target.closest<HTMLElement>('[data-fight-card-id]')
    : null

  return !currentFightElement?.contains(nextFocusedElement)
}

export const isEnterNavigationBlur = (event: FocusEvent) =>
  isElement(event.target) && event.target.dataset.fightScoreEnterNavigation === 'true'

export const isTabNavigationBlur = (event: FocusEvent) =>
  isElement(event.target) && event.target.dataset.fightScoreTabNavigation === 'true'

export const clearEnterNavigationMarker = (event: FocusEvent) => {
  if (isElement(event.target)) {
    delete event.target.dataset.fightScoreEnterNavigation
  }
}

export const clearTabNavigationMarker = (event: FocusEvent) => {
  if (isElement(event.target)) {
    delete event.target.dataset.fightScoreTabNavigation
  }
}

export const isExternalTieHighlightSuppressed = (event: FocusEvent) =>
  isElement(event.target) &&
  event.target.dataset.fightScoreSuppressExternalTieHighlight === 'true'

export const clearExternalTieHighlightSuppression = (event: FocusEvent) => {
  if (isElement(event.target)) {
    delete event.target.dataset.fightScoreSuppressExternalTieHighlight
  }
}

const suppressExternalTieHighlightForActiveScoreInput = (
  currentFightElement: HTMLElement | null
) => {
  const activeElement = document.activeElement
  if (
    isElement(activeElement) &&
    activeElement.dataset.fightScoreInput === 'true' &&
    !currentFightElement?.contains(activeElement)
  ) {
    activeElement.dataset.fightScoreSuppressExternalTieHighlight = 'true'
  }
}

export const focusFirstInputInFightRound = (fightId: number, roundIndex: number) => {
  const currentFightElement = document.querySelector<HTMLElement>(
    `[data-fight-card-id="${fightId}"]`
  )
  const input = currentFightElement?.querySelector<HTMLInputElement>(
    `[data-fight-score-input="true"][data-round-index="${roundIndex}"][data-fighter-side="1"]`
  )

  if (input) {
    suppressExternalTieHighlightForActiveScoreInput(currentFightElement)
    input.focus()
  }
}
