// ============================================================================
// CONFIGURACAO DO BANCO DE DADOS - Neon Postgres (driver pg nativo)
// ============================================================================

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const dbUrl = process.env['DATABASE_URL'];
if (!dbUrl) {
  throw new Error('DATABASE_URL nao definida. Verifique as variaveis de ambiente.');
}

export const pool = new Pool({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.connect((err: Error | undefined, client: pg.PoolClient | undefined, release: (release?: unknown) => void) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados Neon:', err.message);
    return;
  }
  console.log('Banco de dados Neon Postgres conectado com sucesso!');
  release();
});

export async function query(text: string, params?: unknown[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params as pg.QueryConfigValues<unknown[]>);
    const duration = Date.now() - start;
    if (process.env['NODE_ENV'] === 'development') {
      console.log('Query executada', { sql: text.slice(0, 80), duration: `${duration}ms`, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('Erro na query:', text.slice(0, 80), error);
    throw error;
  }
}

export async function queryOne<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T | null> {
  const result = await query(text, params);
  return (result.rows[0] as T) || null;
}

export async function queryMany<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await query(text, params);
  return result.rows as T[];
}
