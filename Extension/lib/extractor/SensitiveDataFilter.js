// lib/extractor/SensitiveDataFilter.js — 敏感欄位過濾

const DEFAULT_FIELD_BLACKLIST = [
  /password/i, /secret/i, /token/i, /api[_-]?key/i,
  /credit[_-]?card/i, /ssn/i, /cvv/i, /pin/i
]

const VALUE_PATTERNS = [
  { name: 'email', rx: /^[\w.+-]+@[\w-]+\.[\w.-]+$/ },
  { name: 'jwt', rx: /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/ },
  { name: 'uuid', rx: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i },
  { name: 'bearer', rx: /^Bearer\s+/i },
  { name: 'credit-card', test: (v) => /^\d{13,19}$/.test(v.replace(/\s|-/g, '')) && luhn(v.replace(/\s|-/g, '')) }
]

function luhn(num) {
  let sum = 0
  let even = false
  for (let i = num.length - 1; i >= 0; i--) {
    let digit = parseInt(num[i])
    if (even) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    even = !even
  }
  return sum % 10 === 0
}

export class SensitiveDataFilter {
  constructor(customBlacklist = []) {
    this.customBlacklist = customBlacklist.map(p => new RegExp(p, 'i'))
  }

  filter(elementData) {
    const filtered = { ...elementData }

    const fieldName = filtered.name || filtered.id || filtered.attributes?.name || ''
    const fieldType = filtered.attributes?.type || ''

    if (this._isBlacklistedField(fieldName) || fieldType === 'password') {
      filtered.value = this._redact('value', 'blacklist', filtered.value)
      filtered.text = this._redact('text', 'blacklist', filtered.text)
    } else {
      if (filtered.value) filtered.value = this._filterValue(filtered.value)
      if (filtered.text) filtered.text = this._filterValue(filtered.text)
    }

    // 長度截斷
    if (filtered.value && filtered.value.length > 200) {
      filtered.value = filtered.value.substring(0, 200) + '...[truncated]'
    }
    if (filtered.textContentRaw && filtered.textContentRaw.length > 200) {
      filtered.textContentRaw = filtered.textContentRaw.substring(0, 200) + '...[truncated]'
    }

    return filtered
  }

  _isBlacklistedField(name) {
    if (!name) return false
    return [...DEFAULT_FIELD_BLACKLIST, ...this.customBlacklist].some(rx => rx.test(name))
  }

  _filterValue(value) {
    if (!value) return value
    for (const { name, rx, test } of VALUE_PATTERNS) {
      if ((rx && rx.test(value)) || (test && test(value))) {
        return `[REDACTED:${name}]`
      }
    }
    return value
  }

  _redact(field, reason, value) {
    return value ? `[REDACTED:${reason}]` : value
  }
}
