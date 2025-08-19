export function getDate(age: number): string {
  const currentDate = new Date()
  const outputDate = new Date(currentDate.setFullYear(currentDate.getFullYear() - age))

  const day = String(outputDate.getDate()).padStart(2, '0')
  const month = String(outputDate.getMonth() + 1).padStart(2, '0')
  const year = outputDate.getFullYear()

  return `${day}-${month}-${year}`
}

export function parseDateString(dateString: string) {
  const [day, month, year] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}
