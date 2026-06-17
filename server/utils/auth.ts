// ============================================================================
// UTILITARIOS DE AUTENTICACAO - Hash de senha e JWT
// ============================================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env['JWT_SECRET'] || 'chave-secreta-padrao-mude-isso';
const JWT_EXPIRES_IN = process.env['JWT_EXPIRES_IN'] || '24h';

export interface JWTPayload {
  userId: string;
  email: string;
}

export async function hashSenha(senha: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(senha, saltRounds);
}

export async function compararSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

export function gerarToken(userId: string, email: string): string {
  const payload: JWTPayload = { userId, email };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verificarToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}
