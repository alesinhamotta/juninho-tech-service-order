// ============================================================================
// ROTAS DE ORDENS DE SERVIÇO — /api/os
// Sistema Juninho Tech OS v2
// ============================================================================
import { Router, type Request, type Response } from 'express';
import { query, queryOne, queryMany } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const STATUS_VALIDOS = [
  'ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO_PECA',
  'PRONTO', 'ENTREGUE', 'SEM_SOLUCAO', 'ORCAMENTO_NEGADO',
];

// GET /api/os — Listar OS com filtros
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, search, data_inicio, data_fim, limit } = req.query as Record<string, string>;

    let sql = `
      SELECT
        os.id, os.numero_os, os.status, os.aparelho_marca, os.aparelho_modelo,
        os.valor_final, os.data_criacao, os.leva_traz,
        c.nome AS cliente_nome, c.telefone AS cliente_telefone
      FROM service_orders os
      LEFT JOIN clientes c ON os.cliente_id = c.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let idx = 1;

    if (status) { sql += ` AND os.status = $${idx++}`; params.push(status); }
    if (search) {
      sql += ` AND (c.nome ILIKE $${idx} OR CAST(os.numero_os AS TEXT) ILIKE $${idx} OR os.aparelho_marca ILIKE $${idx} OR os.aparelho_modelo ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (data_inicio) { sql += ` AND os.data_criacao >= $${idx++}`; params.push(data_inicio); }
    if (data_fim) { sql += ` AND os.data_criacao < ($${idx++}::date + interval '1 day')`; params.push(data_fim); }

    sql += ` ORDER BY os.data_criacao DESC`;
    if (limit) { sql += ` LIMIT $${idx++}`; params.push(parseInt(limit)); }

    const rows = await queryMany<Record<string, unknown>>(sql, params);
    res.json({ data: rows, total: rows.length });
  } catch (error) {
    console.error('Erro ao listar OS:', error);
    res.status(500).json({ error: 'Erro interno ao listar ordens de serviço' });
  }
});

// GET /api/os/:id — Obter OS completa
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const os = await queryOne<Record<string, unknown>>(
      `SELECT os.*, c.nome AS cliente_nome, c.telefone AS cliente_telefone,
              c.email AS cliente_email, c.rua AS cliente_rua,
              c.bairro AS cliente_bairro, c.cidade AS cliente_cidade,
              c.estado AS cliente_estado, c.cep AS cliente_cep
       FROM service_orders os
       LEFT JOIN clientes c ON os.cliente_id = c.id
       WHERE os.id = $1`,
      [req.params['id']]
    );
    if (!os) { res.status(404).json({ error: 'OS não encontrada' }); return; }

    const itens = await queryMany<Record<string, unknown>>(
      `SELECT i.id, i.produto_id, i.descricao_manual, i.quantidade, i.preco_unitario,
              (i.quantidade * i.preco_unitario) AS subtotal, p.nome AS produto_nome
       FROM itens_os i LEFT JOIN produtos p ON i.produto_id = p.id
       WHERE i.os_id = $1 ORDER BY i.data_criacao`,
      [os['id']]
    );

    const cliente = {
      id: os['cliente_id'], nome: os['cliente_nome'], telefone: os['cliente_telefone'],
      email: os['cliente_email'], rua: os['cliente_rua'], bairro: os['cliente_bairro'],
      cidade: os['cliente_cidade'], estado: os['cliente_estado'], cep: os['cliente_cep'],
    };

    res.json({ data: { ...os, cliente, itens: itens.map((i) => ({ ...i, descricao_manual: i['descricao_manual'] || i['produto_nome'] || '' })) } });
  } catch (error) {
    console.error('Erro ao buscar OS:', error);
    res.status(500).json({ error: 'Erro interno ao buscar OS' });
  }
});

// POST /api/os — Criar nova OS
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      cliente_id, aparelho_marca, aparelho_modelo, aparelho_cor, aparelho_imei,
      acessorios, problema_descrito, diagnostico, servico_realizado,
      garantia_dias, valor_pecas, valor_servico, valor_final,
      leva_traz, endereco_coleta, observacoes, itens,
    } = req.body as Record<string, unknown>;

    if (!cliente_id) { res.status(400).json({ error: 'Cliente é obrigatório' }); return; }

    const clienteExiste = await queryOne('SELECT id FROM clientes WHERE id = $1', [cliente_id]);
    if (!clienteExiste) { res.status(400).json({ error: 'Cliente não encontrado' }); return; }

    const novaOS = await queryOne<Record<string, unknown>>(
      `INSERT INTO service_orders (
        cliente_id, status, aparelho_marca, aparelho_modelo, aparelho_cor, aparelho_imei,
        acessorios, problema_descrito, diagnostico, servico_realizado,
        garantia_dias, valor_pecas, valor_servico, valor_final,
        leva_traz, endereco_coleta, observacoes
      ) VALUES ($1,'ABERTA',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [
        cliente_id, aparelho_marca || null, aparelho_modelo || null,
        aparelho_cor || null, aparelho_imei || null, acessorios || null,
        problema_descrito || null, diagnostico || null, servico_realizado || null,
        garantia_dias || 90, valor_pecas || 0, valor_servico || 0, valor_final || 0,
        leva_traz || false, endereco_coleta || null, observacoes || null,
      ]
    );

    if (Array.isArray(itens) && itens.length > 0) {
      for (const item of itens as Array<Record<string, unknown>>) {
        await query(
          `INSERT INTO itens_os (os_id, produto_id, descricao_manual, quantidade, preco_unitario)
           VALUES ($1,$2,$3,$4,$5)`,
          [novaOS!['id'], item['produto_id'] || null, item['descricao_manual'] || null, item['quantidade'] || 1, item['preco_unitario'] || 0]
        );
      }
    }

    const cliente = await queryOne<{ nome: string; telefone: string }>(
      'SELECT nome, telefone FROM clientes WHERE id = $1', [cliente_id]
    );

    res.status(201).json({ message: 'OS criada com sucesso', data: { ...novaOS, cliente } });
  } catch (error) {
    console.error('Erro ao criar OS:', error);
    res.status(500).json({ error: 'Erro interno ao criar OS' });
  }
});

// PUT /api/os/:id — Atualizar campos da OS
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      diagnostico, servico_realizado, valor_servico, valor_pecas, valor_final,
      observacoes, aparelho_marca, aparelho_modelo, aparelho_cor, aparelho_imei,
      acessorios, problema_descrito, garantia_dias,
    } = req.body as Record<string, unknown>;

    const atualizado = await queryOne<Record<string, unknown>>(
      `UPDATE service_orders SET
        diagnostico=COALESCE($1,diagnostico), servico_realizado=COALESCE($2,servico_realizado),
        valor_servico=COALESCE($3,valor_servico), valor_pecas=COALESCE($4,valor_pecas),
        valor_final=COALESCE($5,valor_final), observacoes=COALESCE($6,observacoes),
        aparelho_marca=COALESCE($7,aparelho_marca), aparelho_modelo=COALESCE($8,aparelho_modelo),
        aparelho_cor=COALESCE($9,aparelho_cor), aparelho_imei=COALESCE($10,aparelho_imei),
        acessorios=COALESCE($11,acessorios), problema_descrito=COALESCE($12,problema_descrito),
        garantia_dias=COALESCE($13,garantia_dias)
      WHERE id=$14 RETURNING *`,
      [
        diagnostico || null, servico_realizado || null,
        valor_servico != null ? valor_servico : null,
        valor_pecas != null ? valor_pecas : null,
        valor_final != null ? valor_final : null,
        observacoes || null, aparelho_marca || null, aparelho_modelo || null,
        aparelho_cor || null, aparelho_imei || null, acessorios || null,
        problema_descrito || null, garantia_dias || null,
        req.params['id'],
      ]
    );

    if (!atualizado) { res.status(404).json({ error: 'OS não encontrada' }); return; }
    res.json({ message: 'OS atualizada', data: atualizado });
  } catch (error) {
    console.error('Erro ao atualizar OS:', error);
    res.status(500).json({ error: 'Erro interno ao atualizar OS' });
  }
});

// PATCH /api/os/:id/status — Alterar status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body as { status: string };
    if (!STATUS_VALIDOS.includes(status)) {
      res.status(400).json({ error: `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}` });
      return;
    }

    let extraSQL = '';
    const extraParams: unknown[] = [];
    let paramIdx = 3;

    if (['PRONTO', 'SEM_SOLUCAO', 'ORCAMENTO_NEGADO'].includes(status)) {
      extraSQL += `, data_conclusao = COALESCE(data_conclusao, $${paramIdx++})`;
      extraParams.push(new Date().toISOString());
    }
    if (status === 'ENTREGUE') {
      extraSQL += `, data_entrega = $${paramIdx++}, data_conclusao = COALESCE(data_conclusao, $${paramIdx++})`;
      extraParams.push(new Date().toISOString(), new Date().toISOString());
    }

    const atualizado = await queryOne<Record<string, unknown>>(
      `UPDATE service_orders SET status=$1${extraSQL} WHERE id=$2 RETURNING *`,
      [status, req.params['id'], ...extraParams]
    );

    if (!atualizado) { res.status(404).json({ error: 'OS não encontrada' }); return; }
    res.json({ message: 'Status atualizado', data: atualizado });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro interno ao atualizar status' });
  }
});

export default router;
