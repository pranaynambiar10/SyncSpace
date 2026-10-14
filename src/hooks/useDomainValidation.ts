import { useState, useCallback, useRef } from 'react'
import { checkEmailDomain, fetchAllowedDomains, invalidateDomainCache } from '@/lib/domain'
import type { AllowedDomain } from '@/lib/domain'

interface UseDomainValidationReturn {
  /** Run a client-side domain check (debounced internally) */
  validate:       (email: string) => Promise<void>
  /** True while a validation request is in flight */
  validating:     boolean
  /** Validation error message, or null if valid / not yet checked */
  domainError:    string | null
  /** The matched allowed-domain record, or null */
  matchedDomain:  AllowedDomain | null
  /** All allowed domains (for the example hint) */
  allowedDomains: AllowedDomain[]
  /** Force-load allowed domains list */
  loadDomains:    () => Promise<void>
  /** Clear cached domains (call after admin changes) */
  bust:           () => void
}

/**
 * React hook that wraps the client-side email domain validation.
 * Debounces calls so a new check only fires when the user pauses typing.
 */
export function useDomainValidation(): UseDomainValidationReturn {
  const [validating,     setValidating]     = useState(false)
  const [domainError,    setDomainError]    = useState<string | null>(null)
  const [matchedDomain,  setMatchedDomain]  = useState<AllowedDomain | null>(null)
  const [allowedDomains, setAllowedDomains] = useState<AllowedDomain[]>([])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const validate = useCallback((email: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    return new Promise<void>(resolve => {
      debounceRef.current = setTimeout(async () => {
        if (!email || !email.includes('@')) {
          setDomainError(null)
          setMatchedDomain(null)
          resolve()
          return
        }
        setValidating(true)
        const result = await checkEmailDomain(email)
        setValidating(false)
        setDomainError(result.valid ? null : (result.reason ?? 'Invalid domain'))
        setMatchedDomain(result.allowed)
        resolve()
      }, 400)
    })
  }, [])

  const loadDomains = useCallback(async () => {
    const domains = await fetchAllowedDomains()
    setAllowedDomains(domains)
  }, [])

  const bust = useCallback(() => {
    invalidateDomainCache()
    setAllowedDomains([])
  }, [])

  return {
    validate,
    validating,
    domainError,
    matchedDomain,
    allowedDomains,
    loadDomains,
    bust,
  }
}
