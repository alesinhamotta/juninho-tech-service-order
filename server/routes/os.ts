// ============================================================================
// ROTAS DE ORDENS DE SERVICO - /api/os
// ============================================================================

import { Router, type Request, type Response } from 'express';
import { query, queryOne, queryMany } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/os - Listar todas as ordens de servico
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query['status'] as string | undefined;
    const tipo = req.query['tipo'] as string | undefined;
    const search = req.query['search'] as string | undefined;

    let sql = `
      SELECT
        os.*,
        c.nome AS cliente_nome,
        c.telefone AS cliente_telefone,
        c.email AS cliente_email
      FROM service_orders os
      LEFT JOIN clientes c ON os.cliente_id = c.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let idx = 1;

    if (status) { sql += ` AND os.status = $${idx++}`; params.push(status); }
    if (tipo) { sql += ` AND os.tipo = $${idx++}`; params.push(tipo); }
    if (search) {
      sql += ` AND (os.numero_os ILIKE $${idx} OR os.descricao ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    sql += ` ORDER BY os.data_criacao DESC`;

    const rows = await queryMany<Record<string, unknown>>(sql, params);

    const data = rows.map((row) => ({
      ...row,
      clientes: {
        nome: row['cliente_nome'],
        telefone: row['cliente_telefone'],
        email: row['cliente_email'],
      },
    }));

    res.json({ data, total: data.length });
  } catch (error) {
    console.error('Erro ao listar ordens de servico:', error);
    res.status(500).json({ error: 'Erro interno ao listar ordens de servico' });
  }
});

// GET /api/os/:id - Obter OS completa com itens
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const os = await queryOne<Record<string, unknown>>(
      `SELECT os.*, c.nome AS cliente_nome, c.telefone AS cliente_telefone,
              c.email AS cliente_email, c.endereco AS cliente_endereco,
              c.cidade AS cliente_cidade, c.estado AS cliente_estado
       FROM service_orders os
       LEFT JOIN clientes c ON os.cliente_id = c.id
       WHERE os.id = $1`,
      [req.params['id']]
    );

    if (!os) {
      res.status(404).json({ error: 'Ordem de servico nao encontrada' });
      return;
    }

    const itens = await queryMany(
      `SELECT i.*, p.nome AS produto_nome, p.categoria AS produto_categoria
       FROM itens_os i
       LEFT JOIN produtos p ON i.produto_id = p.id
       WHERE i.os_id = $1`,
      [req.params['id']]
    );

    res.json({
      ...os,
      clientes: {
        nome: os['cliente_nome'],
        telefone: os['cliente_telefone'],
        email: os['cliente_email'],
        endereco: os['cliente_endereco'],
        cidade: os['cliente_cidade'],
        estado: os['cliente_estado'],
      },
      itens_os: itens,
    });
  } catch (error) {
    console.error('Erro ao buscar OS:', error);
    res.status(500).json({ error: 'Erro interno ao buscar ordem de servico' });
  }
});

// POST /api/os - Criar nova ordem de servico
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      cliente_id, tipo, descricao, desconto,
      forma_pagamento, parcelas, garantia_meses, observacoes,
    } = req.body as Record<string, unknown>;

    if (!cliente_id || !tipo) {
      res.status(400).json({ error: 'Cliente e tipo da OS sao obrigatorios' });
      return;
    }

    const tiposValidos = ['ORCAMENTO', 'VENDA', 'REPARO'];
    if (!tiposValidos.includes(tipo as string)) {
      res.status(400).json({ error: `Tipo invalido. Use: ${tiposValidos.join(', ')}` });
      return;
    }

    const dataStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countResult = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM service_orders', []);
    const numeroOS = `OS-${dataStr}-${String(Number(countResult?.count || 0) + 1).padStart(4, '0')}`;

    const novaOS = await queryOne<Record<string, unknown>>(
      `INSERT INTO service_orders
         (numero_os, cliente_id, tipo, status, descricao, desconto, valor_total,
          valor_final, forma_pagamento, parcelas, garantia_meses, observacoes)
       VALUES ($1,$2,$3,'PENDENTE',$4,$5,0,0,$6,$7,$8,$9)
       RETURNING *`,
      [
        numeroOS, cliente_id, tipo, descricao || null,
        desconto || 0, forma_pagamento || 'PENDENTE',
        parcelas || 1, garantia_meses || 12, observacoes || null,
      ]
    );

    const cliente = await queryOne<{ nome: string; telefone: string }>(
      'SELECT nome, telefone FROM clientes WHERE id = $1', [cliente_id]
    );

    res.status(201).json({
      message: 'Ordem de servico criada com sucesso',
      data: { ...novaOS, clientes: cliente },
    });
  } catch (error) {
    console.error('Erro ao criar OS:', error);
    res.status(500).json({ error: 'Erro interno ao criar ordem de servico' });
  }
});

// POST /api/os/:id/itens - Adicionar item/peca a OS
router.post('/:id/itens', async (req: Request, res: Response) => {
  try {
    const { produto_id, descricao, quantidade, preco_unitario, tipo } = req.body as Record<string, unknown>;
    const osId = req.params['id'];

    if (!quantidade || !preco_unitario || !tipo) {
      res.status(400).json({ error: 'Quantidade, preco unitario e tipo sao obrigatorios' });
      return;
    }

    const subtotal = Number(quantidade) * Number(preco_unitario);

    const novoItem = await queryOne(
      `INSERT INTO itens_os (os_id, produto_id, descricao, quantidade, preco_unitario, subtotal, tipo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [osId, produto_id || null, descricao || null, quantidade, preco_unitario, subtotal, tipo]
    );

    const totaisResult = await queryOne<{ total: string; desconto: string }>(
      `SELECT COALESCE(SUM(i.subtotal), 0) AS total, os.desconto
       FROM itens_os i
       RIGHT JOIN service_orders os ON os.id = $1
       WHERE i.os_id = $1 OR i.os_id IS NULL
       GROUP BY os.desconto`,
      [osId]
    );

    const valorTotal = Number(totaisResult?.total || 0);
    const desconto = Number(totaisResult?.desconto || 0);
    const valorFinal = valorTotal - desconto;

    await query(
      'UPDATE service_orders SET valor_total=$1, valor_final=$2 WHERE id=$3',
      [valorTotal, valorFinal, osId]
    );

    res.status(201).json({
      message: 'Item adicionado com sucesso',
      data: novoItem,
      valor_total: valorTotal,
      valor_final: valorFinal,
    });
  } catch (error) {
    console.error('Erro ao adicionar item:', error);
    res.status(500).json({ error: 'Erro interno ao adicionar item' });
  }
});

// PUT /api/os/:id - Atualizar status/pagamento da OS
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      status, forma_pagamento, parcelas, desconto,
      data_pagamento, data_conclusao, observacoes,
    } = req.body as Record<string, unknown>;

    const statusValidos = ['PENDENTE', 'APROVADO', 'PAGO', 'CONCLUIDO', 'CANCELADO'];
    if (status && !statusValidos.includes(status as string)) {
      res.status(400).json({ error: `Status invalido. Use: ${statusValidos.join(', ')}` });
      return;
    }

    const osAtual = await queryOne<{ valor_total: string; desconto: string }>(
      'SELECT valor_total, desconto FROM service_orders WHERE id = $1',
      [req.params['id']]
    );
    if (!osAtual) {
      res.status(404).json({ error: 'Ordem de servico nao encontrada' });
      return;
    }

    const novoDesconto = desconto !== undefined ? Number(desconto) : Number(osAtual.desconto);
    const valorFinal = Number(osAtual.valor_total) - novoDesconto;

    const osAtualizada = await queryOne(
      `UPDATE service_orders SET
         status = COALESCE($1, status),
         forma_pagamento = COALESCE($2, forma_pagamento),
         parcelas = COALESCE($3, parcelas),
         desconto = $4,
         valor_final = $5,
         data_pagamento = COALESCE($6, data_pagamento),
         data_conclusao = COALESCE($7, data_conclusao),
         observacoes = COALESCE($8, observacoes)
       WHERE id = $9
       RETURNING *`,
      [
        status || null, forma_pagamento || null, parcelas || null,
        novoDesconto, valorFinal,
        data_pagamento || null, data_conclusao || null, observacoes || null,
        req.params['id'],
      ]
    );

    res.json({ message: 'Ordem de servico atualizada com sucesso', data: osAtualizada });
  } catch (error) {
    console.error('Erro ao atualizar OS:', error);
    res.status(500).json({ error: 'Erro interno ao atualizar ordem de servico' });
  }
});

// POST /api/os/:id/converter-venda - Converter orcamento em venda
router.post('/:id/converter-venda', async (req: Request, res: Response) => {
  try {
    const { forma_pagamento, parcelas, data_pagamento } = req.body as Record<string, unknown>;

    const os = await queryOne<{ tipo: string; status: string }>(
      'SELECT tipo, status FROM service_orders WHERE id = $1',
      [req.params['id']]
    );

    if (!os) {
      res.status(404).json({ error: 'Ordem de servico nao encontrada' });
      return;
    }
    if (os.tipo !== 'ORCAMENTO') {
      res.status(400).json({ error: 'Somente orcamentos podem ser convertidos em venda' });
      return;
    }
    if (os.status === 'CANCELADO') {
      res.status(400).json({ error: 'Nao e possivel converter um orcamento cancelado' });
      return;
    }

    const osConvertida = await queryOne(
      `UPDATE service_orders
       SET tipo='VENDA', status='PAGO',
           forma_pagamento=COALESCE($1, forma_pagamento),
           parcelas=COALESCE($2, parcelas),
           data_pagamento=COALESCE($3, NOW())
       WHERE id=$4
       RETURNING *`,
      [forma_pagamento || null, parcelas || null, data_pagamento || null, req.params['id']]
    );

    res.json({ message: 'Orcamento convertido em venda com sucesso', data: osConvertida });
  } catch (error) {
    console.error('Erro ao converter OS:', error);
    res.status(500).json({ error: 'Erro interno ao converter orcamento em venda' });
  }
});

export default router;
