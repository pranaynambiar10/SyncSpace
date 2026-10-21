import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import WebSocket from 'ws';

// Ensure WebSocket is available for Node environment
(global as any).WebSocket = WebSocket;

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

async function checkDatabase() {
  console.log(`Connecting to Supabase at: ${supabaseUrl}`);
  
  const tables = [
    'universities',
    'allowed_email_domains',
    'departments',
    'semesters',
    'subjects',
    'subject_modules',
    'academic_notes',
    'note_ratings',
    'assignments',
    'assignment_members',
    'tasks',
    'task_submissions',
    'assignment_messages'
  ];

  console.log('\n--- Checking Table Existence & Read Access ---');
  for (const table of tables) {
    const res = await supabase.from(table).select('*').limit(1);
    if (res.error) {
      console.log(`❌ Table [${table}]: ${res.error.message} (code: ${res.error.code})`);
    } else {
      console.log(`✅ Table [${table}]: Accessible (found ${res.data.length} sample rows)`);
    }
  }

  console.log('\n--- Checking Sample Seed Data in Universities ---');
  const { data: univs, error: uErr } = await supabase.from('universities').select('id, name, slug');
  if (uErr) {
    console.log(`❌ Universities query: ${uErr.message}`);
  } else {
    console.log(`✅ Found ${univs?.length || 0} universities:`, univs);
  }

  console.log('\n--- Checking Academic Notes View ---');
  const { data: notes, error: nErr } = await supabase.from('top_rated_notes_view').select('*').limit(5);
  if (nErr) {
    console.log(`❌ top_rated_notes_view query: ${nErr.message}`);
  } else {
    console.log(`✅ top_rated_notes_view accessible! Sample count: ${notes?.length || 0}`);
  }

  console.log('\n--- Checking Storage Buckets ---');
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) {
    console.log(`❌ Buckets query: ${bErr.message}`);
  } else {
    console.log(`✅ Available storage buckets:`, buckets?.map(b => `${b.name} (${b.public ? 'public' : 'private'})`));
  }
}

checkDatabase();
