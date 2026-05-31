// ============================================================================
// UTILITÁRIOS DE AUTENTICAÇÃO - Hash de senha e JWT
// ============================================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'chave-secreta-padrao-mude-isso';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// ============================================================================
// HASH DE SENHA
// ============================================================================

/**
 * Gera o hash de uma senha usando bcrypt
 */
export async function hashSenha(senha: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(senha, saltRounds);
}

/**
 * Compara uma senha em texto plano com o hash armazenado
 */
export async function compararSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

// ============================================================================
// JWT - JSON Web Token
// ============================================================================

export interface JWTPayload {
  userId: string;
  email: string;
}

/**
 * Gera um token JWT para o usuário autenticado
 */
export function gerarToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email } as JWTPayload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );
}

/**
 * Verifica e decodifica um token JWT
 */
export function verificarToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}
