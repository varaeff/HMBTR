import http from './http'
import type { User } from '@/model'

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
  name: string
  surname: string
  patronymic?: string
  email?: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
}

export const registerAuth = async (data: RegisterRequest): Promise<AuthResponse> => {
  const response = await http.post<AuthResponse>('/auth/register', data)
  return response.data
}

export const loginAuth = async (data: LoginRequest): Promise<AuthResponse> => {
  const response = await http.post<AuthResponse>('/auth/login', data)
  return response.data
}

export const logoutAuth = async (): Promise<void> => {
  await http.post('/auth/logout')
}

export const refreshAuth = async (refreshToken: string): Promise<AuthResponse> => {
  const response = await http.post<AuthResponse>('/auth/refresh', {
    refreshToken
  })

  return response.data
}

export const fetchAuthProfile = async (): Promise<User> => {
  const response = await http.post<User>('/auth/profile')
  return response.data
}
