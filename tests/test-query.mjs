import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import WebSocket from 'ws';

global.WebSocket = WebSocket;
dotenv.config({ path: '.env.local' });

const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

async function run() {
  const { data: univs } = await s.from('universities').select('*');
  console.log('Universities count:', univs?.length);

  const { data: domains } = await s.from('allowed_email_domains').select('*');
  console.log('Allowed domains:', domains?.map(d => d.domain));

  const { data: depts } = await s.from('departments').select('name, code');
  console.log('Departments:', depts);

  const { data: sems } = await s.from('semesters').select('label, sort_order');
  console.log('Semesters count:', sems?.length);

  const { data: subs, error: subErr } = await s.from('subjects').select('*');
  console.log('Subjects:', subs, 'Error:', subErr?.message);
}

run();
