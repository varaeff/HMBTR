export function parseDateString(dateString: string) {
  const [day, month, year] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}
