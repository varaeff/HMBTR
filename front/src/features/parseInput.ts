function parseInput(checkString: string): string {
  const regexp = /^[a-zA-Zа-яА-ЯёЁ ]*$/
  if (checkString.length && !checkString[checkString.length - 1].match(regexp)) {
    return checkString.slice(0, -1)
  }
  return checkString
}

export default parseInput
