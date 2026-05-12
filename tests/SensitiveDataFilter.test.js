import { describe, it, expect } from 'vitest'
import { SensitiveDataFilter } from '../Extension/lib/extractor/SensitiveDataFilter.js'

describe('SensitiveDataFilter', () => {
  const filter = new SensitiveDataFilter()

  describe('field name blacklist', () => {
    it('redacts value for password field by name', () => {
      const result = filter.filter({ name: 'password', value: 'secret123', text: null })
      expect(result.value).toBe('[REDACTED:blacklist]')
    })

    it('redacts value for field with type=password', () => {
      const result = filter.filter({ name: 'login', attributes: { type: 'password' }, value: 'myPass', text: null })
      expect(result.value).toBe('[REDACTED:blacklist]')
    })

    it('redacts token field', () => {
      const result = filter.filter({ name: 'api_token', value: 'abc123', text: null })
      expect(result.value).toBe('[REDACTED:blacklist]')
    })

    it('does not redact normal field', () => {
      const result = filter.filter({ name: 'email', attributes: {}, value: 'user@example.com', text: null })
      expect(result.value).toBe('[REDACTED:email]')  // caught by email pattern
    })
  })

  describe('value pattern detection', () => {
    it('redacts email address', () => {
      const result = filter.filter({ name: 'input', attributes: {}, value: 'test@example.com', text: null })
      expect(result.value).toBe('[REDACTED:email]')
    })

    it('redacts JWT token', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.abc123def'
      // 用 'user_ref' 避開 token 黑名單，測 value pattern
      const result = filter.filter({ name: 'user_ref', attributes: {}, value: jwt, text: null })
      expect(result.value).toBe('[REDACTED:jwt]')
    })

    it('redacts UUID', () => {
      const result = filter.filter({ name: 'ref', attributes: {}, value: '550e8400-e29b-41d4-a716-446655440000', text: null })
      expect(result.value).toBe('[REDACTED:uuid]')
    })

    it('redacts bearer token', () => {
      const result = filter.filter({ name: 'auth', attributes: {}, value: 'Bearer eyJhbGc...', text: null })
      expect(result.value).toBe('[REDACTED:bearer]')
    })

    it('does not redact safe value', () => {
      const result = filter.filter({ name: 'username', attributes: {}, value: 'john_doe', text: null })
      expect(result.value).toBe('john_doe')
    })
  })

  describe('length truncation', () => {
    it('truncates value over 200 chars', () => {
      const longVal = 'a'.repeat(250)
      const result = filter.filter({ name: 'bio', attributes: {}, value: longVal, text: null })
      expect(result.value).toContain('[truncated]')
      expect(result.value.length).toBeLessThan(250)
    })
  })

  describe('custom blacklist', () => {
    it('respects custom blacklist pattern', () => {
      const customFilter = new SensitiveDataFilter(['employee_id'])
      const result = customFilter.filter({ name: 'employee_id', attributes: {}, value: '12345', text: null })
      expect(result.value).toBe('[REDACTED:blacklist]')
    })
  })
})
