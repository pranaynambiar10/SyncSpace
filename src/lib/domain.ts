/**
 * Client-side email-domain validation helpers.
 * These are UX conveniences only — the security boundary is the Postgres
 * "Before User Created" hook (handle_before_user_created).
 */

import { supabase } from '@/lib/supabase'

export interface AllowedDomain {
  domain: string
  label:  string | null
  university_name: string
}

/** Cache fetched domains for the session to avoid repeated round-trips */
let _domainsCache: AllowedDomain[] | null = null

export async function fetchAllowedDomains(): Promise<AllowedDomain[]> {
  if (_domainsCache !== null) return _domainsCache
  const { data, error } = await supabase.rpc('get_allowed_domains')
  if (error) {
    console.error('[domain] fetchAllowedDomains error', error)
    return []
  }
  _domainsCache = (data as AllowedDomain[]) ?? []
  return _domainsCache
}

/**
 * Invalidate the in-memory domain cache (call after admin adds/deactivates a domain).
 */
export function invalidateDomainCache(): void {
  _domainsCache = null
}

/**
 * Normalize an email address: trim whitespace, lowercase.
 * Returns the normalized email.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Extract the domain portion from an email using the LAST @ as the split point.
 * Returns null if the email is structurally invalid.
 */
export function extractDomain(email: string): string | null {
  const normalized = normalizeEmail(email)
  const atCount = (normalized.match(/@/g) ?? []).length
  if (atCount !== 1) return null

  const atPos = normalized.lastIndexOf('@')
  const local  = normalized.slice(0, atPos)
  const domain = normalized.slice(atPos + 1)

  if (!local || !domain) return null
  return domain
}

export interface DomainCheckResult {
  valid:    boolean
  domain:   string | null
  allowed:  AllowedDomain | null
  /** Human-readable reason when valid === false */
  reason:   string | null
}

/**
 * Client-side domain check against the public allowed-domains list.
 * This is a UX helper; the server enforces the real rule.
 */
export async function checkEmailDomain(email: string): Promise<DomainCheckResult> {
  const domain = extractDomain(email)
  if (!domain) {
    return { valid: false, domain: null, allowed: null, reason: 'Enter a valid email address.' }
  }

  if (domain === 'gmail.com') {
    return {
      valid: true,
      domain,
      allowed: {
        domain: 'gmail.com',
        label: 'Student / Scholar',
        university_name: 'Academic Scholar',
      },
      reason: null,
    }
  }

  const domains = await fetchAllowedDomains()
  const allowed = domains.find(d => d.domain === domain) ?? null

  if (!allowed) {
    const examples = domains.slice(0, 2).map(d => `@${d.domain}`).join(', ')
    const hint = examples ? ` Use your university email (e.g. ${examples}) or Gmail.` : ''
    return {
      valid:   false,
      domain,
      allowed: null,
      reason:  `The domain @${domain} is not permitted.${hint}`,
    }
  }

  return { valid: true, domain, allowed, reason: null }
}
