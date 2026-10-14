import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const isTest = import.meta.env.MODE === 'test'
const supabaseUrl  = (import.meta.env.VITE_SUPABASE_URL as string) || (isTest ? 'https://test-project.supabase.co' : '')
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || (isTest ? 'test-anon-key' : '')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
    'Copy .env.example → .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

/** Single shared Supabase client instance for the browser */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: !isTest,
    detectSessionInUrl: !isTest,
    autoRefreshToken: !isTest,
  },
  realtime: isTest ? { transport: undefined } : undefined,
})
