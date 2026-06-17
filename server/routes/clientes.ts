// ============================================================================
// ROTAS DE CLIENTES - /api/clientes
// ============================================================================

import { Router, type Request, type Response } from 'express';
import { query, queryOne, queryMany } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/clientes - Listar todos os clientes ativos
router.get('/', async (req: Request, res: Response) => {
  try {
    const search = req.query['search'] as string | undefined;

    let sql = `SELECT * FROM clientes WHERE ativo = true`;
    const params: unknown[] = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (nome ILIKE $1 OR telefone ILIKE $1 OR email ILIKE $1)`;
    }

    sql += ` ORDER BY nome ASC`;

    const data = await queryMany(sql, params);
    res.json({ data, total: data.length });
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ error: 'Erro interno ao listar clientes' });
  }
});

// GET /api/clientes/:id - Obter cliente específico
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const cliente = await queryOne('SELECT * FROM clientes WHERE id = $1', [req.params['id']]);
    if (!cliente) {
      res.status(404).json({ error: 'Cliente nao encontrado' });
      return;
    }
    res.json(cliente);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ error: 'Erro interno ao buscar cliente' });
  }
});

// POST /api/clientes - Criar novo cliente
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nome, telefone, email, endereco, cidade, estado, cep, observacoes } = req.body as Record<string, string>;

    if (!nome || !telefone) {
      res.status(400).json({ error: 'Nome e telefone sao obrigatorios' });
      return;
    }

    const existente = await queryOne('SELECT id FROM clientes WHERE telefone = $1', [telefone]);
    if (existente) {
      res.status(400).json({ error: 'Ja existe um cliente com este telefone' });
      return;
    }

    const novoCliente = await queryOne(
      `INSERT INTO clientes (nome, telefone, email, endereco, cidade, estado, cep, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [nome, telefone, email || null, endereco || null, cidade || null, estado || null, cep || null, observacoes || null]
    );

    res.status(201).json({ message: 'Cliente criado com sucesso', data: novoCliente });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ error: 'Erro interno ao criar cliente' });
  }
});

// PUT /api/clientes/:id - Atualizar cliente
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { nome, telefone, email, endereco, cidade, estado, cep, observacoes } = req.body as Record<string, string>;

    if (!nome || !telefone) {
      res.status(400).json({ error: 'Nome e telefone sao obrigatorios' });
      return;
    }

    const clienteAtualizado = await queryOne(
      `UPDATE clientes
       SET nome=$1, telefone=$2, email=$3, endereco=$4, cidade=$5, estado=$6, cep=$7, observacoes=$8
       WHERE id=$9
       RETURNING *`,
      [nome, telefone, email || null, endereco || null, cidade || null, estado || null, cep || null, observacoes || null, req.params['id']]
    );

    if (!clienteAtualizado) {
      res.status(404).json({ error: 'Cliente nao encontrado' });
      return;
    }
    res.json({ message: 'Cliente atualizado com sucesso', data: clienteAtualizado });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ error: 'Erro interno ao atualizar cliente' });
  }
});

// DELETE /api/clientes/:id - Desativar cliente (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await query('UPDATE clientes SET ativo = false WHERE id = $1', [req.params['id']]);
    res.json({ message: 'Cliente desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao desativar cliente:', error);
    res.status(500).json({ error: 'Erro interno ao desativar cliente' });
  }
});

export default router;
