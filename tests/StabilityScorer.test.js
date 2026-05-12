import { describe, it, expect } from 'vitest'
import { StabilityScorer } from '../Extension/lib/validator/StabilityScorer.js'

describe('StabilityScorer', () => {
  const scorer = new StabilityScorer()

  it('scores id-based selector highest', () => {
    const r = scorer.score('#submit-btn', 'css')
    expect(r.score).toBeGreaterThanOrEqual(100)
    expect(r.stars).toBe(5)
  })

  it('scores data-testid very high', () => {
    const r = scorer.score('[data-testid="login-btn"]', 'css')
    expect(r.score).toBeGreaterThanOrEqual(95)
    expect(r.stars).toBeGreaterThanOrEqual(4)
  })

  it('scores aria-label high', () => {
    const r = scorer.score('[aria-label="Close dialog"]', 'css')
    expect(r.score).toBeGreaterThanOrEqual(80)
  })

  it('scores getByRole highly', () => {
    const r = scorer.score("page.getByRole('button', { name: 'Submit' })", 'playwright')
    expect(r.score).toBeGreaterThanOrEqual(70)
  })

  it('penalises nth-of-type', () => {
    const withoutIndex = scorer.score('button.btn', 'css')
    const withIndex = scorer.score('button.btn:nth-of-type(3)', 'css')
    expect(withIndex.score).toBeLessThan(withoutIndex.score)
  })

  it('returns very fragile for empty locator', () => {
    const r = scorer.score('', 'css')
    expect(r.stars).toBe(1)
  })

  it('returns stars display string', () => {
    expect(scorer.starsDisplay(3)).toBe('⭐⭐⭐☆☆')
    expect(scorer.starsDisplay(5)).toBe('⭐⭐⭐⭐⭐')
  })
})
