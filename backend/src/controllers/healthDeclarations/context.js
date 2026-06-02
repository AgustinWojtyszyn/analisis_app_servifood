import '../../config/env.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

export function getSupabaseAdmin() {
  return supabaseAdmin;
}

export function __setSupabaseAdminForTests(client) {
  supabaseAdmin = client;
}
