// ============================================================================
// CONFIGURAÇÃO DO BANCO DE DADOS - Supabase (PostgreSQL)
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios no arquivo .env');
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
