const parseDateString = (dateString: string) => {
  const [day, month, year] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const toISODate = (raw: unknown) => {
  const d = raw instanceof Date ? raw : parseDateString(String(raw))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
