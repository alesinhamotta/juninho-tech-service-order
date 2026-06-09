// ============================================================================
// ROTAS DE CLIENTES - /api/clientes
// ============================================================================

import { Router, Response } from 'express';
import { query, queryOne, queryMany } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// ============================================================================
// GET /api/clientes - Listar todos os clientes ativos
// ============================================================================
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query;

    let sql = `SELECT * FROM clientes WHERE ativo = true`;
    const params: unknown[] = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (nome ILIKE $1 OR telefone ILIKE $1 OR email ILIKE $1)`;
    }

    sql += ` ORDER BY nome ASC`;

    const data = await queryMany(sql, params);
    return res.json({ data, total: data.length });
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    return res.status(500).json({ error: 'Erro interno ao listar clientes' });
  }
});

// ============================================================================
// GET /api/clientes/:id - Obter cliente específico
// ============================================================================
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const cliente = await queryOne('SELECT * FROM clientes WHERE id = $1', [req.params.id]);
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });
    return res.json(cliente);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar cliente' });
  }
});

// ============================================================================
// POST /api/clientes - Criar novo cliente
// ============================================================================
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { nome, telefone, email, endereco, cidade, estado, cep, observacoes } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
    }

    const existente = await queryOne('SELECT id FROM clientes WHERE telefone = $1', [telefone]);
    if (existente) {
      return res.status(400).json({ error: 'Já existe um cliente com este telefone' });
    }

    const novoCliente = await queryOne(
      `INSERT INTO clientes (nome, telefone, email, endereco, cidade, estado, cep, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [nome, telefone, email || null, endereco || null, cidade || null, estado || null, cep || null, observacoes || null]
    );

    return res.status(201).json({ message: 'Cliente criado com sucesso', data: novoCliente });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    return res.status(500).json({ error: 'Erro interno ao criar cliente' });
  }
});

// ============================================================================
// PUT /api/clientes/:id - Atualizar cliente
// ============================================================================
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { nome, telefone, email, endereco, cidade, estado, cep, observacoes } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
    }

    const clienteAtualizado = await queryOne(
      `UPDATE clientes
       SET nome=$1, telefone=$2, email=$3, endereco=$4, cidade=$5, estado=$6, cep=$7, observacoes=$8
       WHERE id=$9
       RETURNING *`,
      [nome, telefone, email || null, endereco || null, cidade || null, estado || null, cep || null, observacoes || null, req.params.id]
    );

    if (!clienteAtualizado) return res.status(404).json({ error: 'Cliente não encontrado' });
    return res.json({ message: 'Cliente atualizado com sucesso', data: clienteAtualizado });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar cliente' });
  }
});

// ============================================================================
// DELETE /api/clientes/:id - Desativar cliente (soft delete)
// ============================================================================
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await query('UPDATE clientes SET ativo = false WHERE id = $1', [req.params.id]);
    return res.json({ message: 'Cliente desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao desativar cliente:', error);
    return res.status(500).json({ error: 'Erro interno ao desativar cliente' });
  }
});

export default router;
