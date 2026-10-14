import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}))

import { normalizeEmail, extractDomain } from '@/lib/domain'

describe('Domain Validation & Normalization Unit Tests', () => {
  it('normalizes email by trimming whitespace and lowercasing', () => {
    expect(normalizeEmail('  Student@UG.CUSAT.AC.IN  ')).toBe('student@ug.cusat.ac.in')
    expect(normalizeEmail('Scholar.2024@GMAIL.COM ')).toBe('scholar.2024@gmail.com')
  })

  it('correctly extracts domain from valid email addresses', () => {
    expect(extractDomain('user@ug.cusat.ac.in')).toBe('ug.cusat.ac.in')
    expect(extractDomain('test.scholar@gmail.com')).toBe('gmail.com')
    expect(extractDomain('faculty@cusat.ac.in')).toBe('cusat.ac.in')
  })

  it('rejects malformed email strings without valid @ separator', () => {
    expect(extractDomain('notanemail')).toBeNull()
    expect(extractDomain('@domain.com')).toBeNull()
    expect(extractDomain('user@')).toBeNull()
    expect(extractDomain('user@@domain.com')).toBeNull()
    expect(extractDomain('user@domain@domain.com')).toBeNull()
  })

  it('preserves institutional subdomains', () => {
    expect(extractDomain('student@it.cusat.ac.in')).toBe('it.cusat.ac.in')
    expect(extractDomain('researcher@cs.pg.cusat.ac.in')).toBe('cs.pg.cusat.ac.in')
  })
})
