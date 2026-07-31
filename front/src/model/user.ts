export interface User {
  id: number
  username: string
  name: string
  surname: string
  patronymic?: string
  email?: string
  is_admin: boolean
  is_organizer: boolean
  is_secretary: boolean
}

export const USERS_TYPES = {
  ALL: 'usersTabsAll',
  ADMINS: 'usersTabsAdmins',
  ORGANIZERS: 'usersTabsOrganizers',
  SECRETARIES: 'usersTabsSecretaries',
  OTHERS: 'usersTabsOthers'
} as const

export type UserType = (typeof USERS_TYPES)[keyof typeof USERS_TYPES]

export interface UsersResponse {
  [USERS_TYPES.ADMINS]: User[]
  [USERS_TYPES.ORGANIZERS]: User[]
  [USERS_TYPES.SECRETARIES]: User[]
  [USERS_TYPES.OTHERS]: User[]
}
