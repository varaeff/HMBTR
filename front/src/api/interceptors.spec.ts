import { describe, expect, it } from 'vitest'
import { isAuthEndpoint } from './interceptors'

describe('api interceptors', () => {
  it('does not route auth endpoints through refresh-token recovery', () => {
    expect(isAuthEndpoint('/auth/login')).toBe(true)
    expect(isAuthEndpoint('/auth/register')).toBe(true)
    expect(isAuthEndpoint('/auth/refresh')).toBe(true)
    expect(isAuthEndpoint('/competition/state')).toBe(false)
    expect(isAuthEndpoint(undefined)).toBe(false)
  })
})
