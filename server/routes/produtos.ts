// ============================================================================
// ROTAS DE PRODUTOS/PECAS - /api/produtos
// ============================================================================

import { Router, type Request, type Response } from 'express';
import { query, queryOne, queryMany } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/produtos - Listar produtos ativos
router.get('/', async (req: Request, res: Response) => {
  try {
    const search = req.query['search'] as string | undefined;
    const categoria = req.query['categoria'] as string | undefined;

    let sql = `SELECT * FROM produtos WHERE ativo = true`;
    const params: unknown[] = [];
    let idx = 1;

    if (search) {
      sql += ` AND (nome ILIKE $${idx} OR categoria ILIKE $${idx} OR marca ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (categoria) {
      sql += ` AND categoria = $${idx}`;
      params.push(categoria);
      idx++;
    }

    sql += ` ORDER BY nome ASC`;

    const data = await queryMany(sql, params);
    res.json({ data, total: data.length });
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ error: 'Erro interno ao listar produtos' });
  }
});

// GET /api/produtos/:id - Obter produto especifico
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const produto = await queryOne('SELECT * FROM produtos WHERE id = $1', [req.params['id']]);
    if (!produto) {
      res.status(404).json({ error: 'Produto nao encontrado' });
      return;
    }
    res.json(produto);
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({ error: 'Erro interno ao buscar produto' });
  }
});

// POST /api/produtos - Criar novo produto
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nome, categoria, marca, modelo, descricao, preco_custo, preco_venda, estoque, estoque_minimo } = req.body as Record<string, unknown>;

    if (!nome || !categoria || preco_venda === undefined) {
      res.status(400).json({ error: 'Nome, categoria e preco de venda sao obrigatorios' });
      return;
    }

    const novoProduto = await queryOne(
      `INSERT INTO produtos (nome, categoria, marca, modelo, descricao, preco_custo, preco_venda, estoque, estoque_minimo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [nome, categoria, marca || null, modelo || null, descricao || null,
       preco_custo || null, preco_venda, estoque || 0, estoque_minimo || 5]
    );

    res.status(201).json({ message: 'Produto criado com sucesso', data: novoProduto });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro interno ao criar produto' });
  }
});

// PUT /api/produtos/:id - Atualizar produto
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { nome, categoria, marca, modelo, descricao, preco_custo, preco_venda, estoque, estoque_minimo } = req.body as Record<string, unknown>;

    if (!nome || !categoria || preco_venda === undefined) {
      res.status(400).json({ error: 'Nome, categoria e preco de venda sao obrigatorios' });
      return;
    }

    const produtoAtualizado = await queryOne(
      `UPDATE produtos
       SET nome=$1, categoria=$2, marca=$3, modelo=$4, descricao=$5,
           preco_custo=$6, preco_venda=$7, estoque=$8, estoque_minimo=$9
       WHERE id=$10
       RETURNING *`,
      [nome, categoria, marca || null, modelo || null, descricao || null,
       preco_custo || null, preco_venda, estoque, estoque_minimo, req.params['id']]
    );

    if (!produtoAtualizado) {
      res.status(404).json({ error: 'Produto nao encontrado' });
      return;
    }
    res.json({ message: 'Produto atualizado com sucesso', data: produtoAtualizado });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro interno ao atualizar produto' });
  }
});

// DELETE /api/produtos/:id - Desativar produto (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await query('UPDATE produtos SET ativo = false WHERE id = $1', [req.params['id']]);
    res.json({ message: 'Produto desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao desativar produto:', error);
    res.status(500).json({ error: 'Erro interno ao desativar produto' });
  }
});

export default router;
