export interface ApiErrorWithResponse {
  response?: {
    data?: unknown
  }
  message?: string
}

export interface ReportErrorData {
  details?: string[] | string | ActiveRedRollbackDetails
  error?: string
}

export interface ActiveRedRollbackCompetitor {
  name: string
  surname: string
  patronymic?: string | null
}

export interface ActiveRedRollbackDetails {
  code: 'ACTIVE_RED_CARD_COMPETITORS_REQUIRE_ROLLBACK'
  block_id: number
  competitors: ActiveRedRollbackCompetitor[]
}

export const isReportErrorData = (value: unknown): value is ReportErrorData =>
  typeof value === 'object' && value !== null

export const isActiveRedRollbackDetails = (value: unknown): value is ActiveRedRollbackDetails =>
  typeof value === 'object' &&
  value !== null &&
  'code' in value &&
  value.code === 'ACTIVE_RED_CARD_COMPETITORS_REQUIRE_ROLLBACK' &&
  'block_id' in value &&
  typeof value.block_id === 'number' &&
  'competitors' in value &&
  Array.isArray(value.competitors)

export const getActiveRedRollbackDetails = (error: unknown) => {
  const responseData = (error as ApiErrorWithResponse).response?.data

  if (!isReportErrorData(responseData)) return null
  return isActiveRedRollbackDetails(responseData.details) ? responseData.details : null
}
