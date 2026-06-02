import '../../config/env.js';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { analyzeExcel } from '../../services/analyzeExcel.js';
import defaultRules from '../../../../shared/businessRules/defaultRules.json' with { type: 'json' };

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

export const prisma = new PrismaClient();
export const STATUS_VALUES = new Set(['active', 'exported', 'archived']);
export const ENABLE_DEBUG_EXCEL_ANALYSIS = process.env.DEBUG_EXCEL_ANALYSIS === 'true';
export const ENABLE_REPROCESS_CLASSIFICATION_TRACE = process.env.REPROCESS_CLASSIFICATION_TRACE === '1';
export const ENABLE_REPROCESS_ISO_TRACE = process.env.REPROCESS_ISO_TRACE === '1';

export function getSupabaseAdmin() {
  return supabaseAdmin;
}

export function __setSupabaseAdminForTests(client) {
  supabaseAdmin = client;
}

export function getUploadDependencies() {
  return {
    analyzeExcel,
    prisma,
    defaultRules,
    supabaseAdmin
  };
}
