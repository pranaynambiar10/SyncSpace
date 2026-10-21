/** Generic utility helpers */

/** Format a date as a readable string in the user's local timezone */
export function formatDate(
  date: string | Date | null | undefined,
  opts?: Intl.DateTimeFormatOptions,
): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
    ...opts,
  })
}

/** Format a date+time string */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Return a relative time string (e.g., "3 hours ago") */
export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d    = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const rtf  = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year',   365 * 24 * 3600 * 1000],
    ['month',   30 * 24 * 3600 * 1000],
    ['week',     7 * 24 * 3600 * 1000],
    ['day',          24 * 3600 * 1000],
    ['hour',              3600 * 1000],
    ['minute',              60 * 1000],
    ['second',               1 * 1000],
  ]
  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms) return rtf.format(-Math.round(diff / ms), unit)
  }
  return 'just now'
}

/** Truncate a string to a max length with ellipsis */
export function truncate(str: string, max = 60): string {
  return str.length <= max ? str : `${str.slice(0, max).trimEnd()}…`
}

/** Format file size in bytes to human-readable string (KB, MB, GB) */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

/** Return initials from a full name (up to 2 letters) */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

/** Deterministic color class index from a string (for avatar fallback colors) */
const AVATAR_COLORS = [
  'bg-violet-600', 'bg-indigo-600', 'bg-blue-600', 'bg-teal-600',
  'bg-emerald-600','bg-amber-600',  'bg-rose-600', 'bg-pink-600',
]
export function avatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

/** Parse a Supabase/Postgres error message to a friendly string */
export function friendlyError(message: string | undefined): string {
  if (!message || message.trim() === '{}' || message.trim() === '{"error":"Internal Server Error"}')
    return 'Authentication error. Please check your credentials or try again.'
  if (message.includes('signup_domain_not_allowed'))
    return 'Your email domain is not permitted. Please use your university email address.'
  if (message.includes('Email not confirmed'))
    return 'Please verify your email before signing in.'
  if (message.includes('Invalid login credentials'))
    return 'Incorrect email or password.'
  if (message.includes('User already registered'))
    return 'An account with this email already exists.'
  if (message.includes('permission_denied'))
    return 'You do not have permission to perform this action.'
  if (message.includes('not_found'))
    return 'The requested item was not found.'
  return message
}

/** A simple class-name joiner (cn) */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
