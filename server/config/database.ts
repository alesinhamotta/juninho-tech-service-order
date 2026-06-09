// ============================================================================
// CONFIGURAÇÃO DO BANCO DE DADOS - Neon Postgres (driver pg nativo)
// ============================================================================

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida. Verifique o arquivo .env');
}

// Pool de conexões com o Neon Postgres
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Necessário para Neon (SSL obrigatório)
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Testar conexão ao iniciar o servidor
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco de dados Neon:', err.message);
    return;
  }
  console.log('✅ Banco de dados Neon Postgres conectado com sucesso!');
  release();
});

// ============================================================================
// FUNÇÕES AUXILIARES DE CONSULTA
// ============================================================================

/**
 * Executa uma query SQL com parâmetros
 * Uso: await query('SELECT * FROM clientes WHERE id = $1', [id])
 */
export async function query(text: string, params?: unknown[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Query', { sql: text.slice(0, 80), duration: `${duration}ms`, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('❌ Erro na query:', text.slice(0, 80), error);
    throw error;
  }
}

/**
 * Retorna um único registro ou null
 */
export async function queryOne<T>(text: string, params?: unknown[]): Promise<T | null> {
  const result = await query(text, params);
  return (result.rows[0] as T) || null;
}

/**
 * Retorna múltiplos registros
 */
export async function queryMany<T>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await query(text, params);
  return result.rows as T[];
}
