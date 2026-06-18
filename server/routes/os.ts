// ============================================================================
// ROTAS DE ORDENS DE SERVIÇO — /api/os
// Sistema Juninho Tech OS v2 — Gestão Financeira Completa
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

// ─── Função auxiliar: calcular financeiro interno ───────────────────────────
function calcularFinanceiro(params: {
  valorFinal: number;
  desconto: number;
  taxaMaquininha: number; // percentual, ex: 16.67
  custoPecas: number;
  custoServico: number;
  brindes: Array<{ custo: number }>;
}) {
  const { valorFinal, desconto, taxaMaquininha, custoPecas, custoServico, brindes } = params;

  // Valor que o cliente paga (já inclui o acréscimo do cartão se houver)
  const valorBruto = valorFinal - desconto;

  // Taxa da maquininha sobre o valor bruto
  const valorTaxa = parseFloat(((valorBruto * taxaMaquininha) / 100).toFixed(2));

  // Valor que o técnico efetivamente recebe (após taxa)
  const valorRecebido = parseFloat((valorBruto - valorTaxa).toFixed(2));

  // Custo total = peças + serviço + brindes
  const custoBrindes = brindes.reduce((acc, b) => acc + b.custo, 0);
  const custoTotal = parseFloat((custoPecas + custoServico + custoBrindes).toFixed(2));

  // Lucro líquido = valor recebido - custo total
  const lucroTotal = parseFloat((valorRecebido - custoTotal).toFixed(2));

  // Margem = lucro / valor recebido * 100
  const margemLucro = valorRecebido > 0
    ? parseFloat(((lucroTotal / valorRecebido) * 100).toFixed(2))
    : 0;

  return { valorTaxa, valorRecebido, custoTotal, lucroTotal, margemLucro };
}

// GET /api/os — Listar OS com filtros
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, search, data_inicio, data_fim, limit } = req.query as Record<string, string>;

    let sql = `
      SELECT
        os.id, os.numero_os, os.status, os.aparelho_marca, os.aparelho_modelo,
        os.valor_final, os.desconto, os.forma_pagamento, os.parcelas,
        os.custo_total_os, os.lucro_total_os, os.margem_lucro_os, os.valor_recebido,
        os.data_criacao, os.leva_traz,
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
      `SELECT i.id, i.produto_id, i.descricao_manual, i.quantidade,
              i.preco_unitario, i.custo_unitario,
              (i.quantidade * i.preco_unitario) AS subtotal,
              (i.quantidade * COALESCE(i.custo_unitario, 0)) AS custo_total_item,
              i.categoria_item, i.eh_brinde,
              p.nome AS produto_nome
       FROM itens_os i LEFT JOIN produtos p ON i.produto_id = p.id
       WHERE i.os_id = $1 ORDER BY i.data_criacao`,
      [os['id']]
    );

    const cliente = {
      id: os['cliente_id'], nome: os['cliente_nome'], telefone: os['cliente_telefone'],
      email: os['cliente_email'], rua: os['cliente_rua'], bairro: os['cliente_bairro'],
      cidade: os['cliente_cidade'], estado: os['cliente_estado'], cep: os['cliente_cep'],
    };

    res.json({
      data: {
        ...os,
        cliente,
        itens: itens.map((i) => ({
          ...i,
          descricao_manual: i['descricao_manual'] || i['produto_nome'] || '',
        })),
      },
    });
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
      // Financeiro interno
      custo_pecas, custo_servico,
      taxa_maquininha, forma_pagamento, parcelas,
      desconto,
      brinde_descricao, brinde_custo,
      // Logística
      leva_traz, endereco_coleta, observacoes, itens,
    } = req.body as Record<string, unknown>;

    if (!cliente_id) { res.status(400).json({ error: 'Cliente é obrigatório' }); return; }

    const clienteExiste = await queryOne('SELECT id FROM clientes WHERE id = $1', [cliente_id]);
    if (!clienteExiste) { res.status(400).json({ error: 'Cliente não encontrado' }); return; }

    // Gerar numero_os único: OS-YYYYMMDD-NNNN
    const hoje = new Date();
    const dataStr = hoje.getFullYear().toString() +
      String(hoje.getMonth() + 1).padStart(2, '0') +
      String(hoje.getDate()).padStart(2, '0');
    const countResult = await queryOne<{ total: string }>(
      `SELECT COUNT(*) AS total FROM service_orders WHERE data_criacao::date = CURRENT_DATE`
    );
    const seq = String(Number(countResult?.total || 0) + 1).padStart(4, '0');
    const numero_os = `OS-${dataStr}-${seq}`;

    // Calcular financeiro interno
    const vFinal = Number(valor_final) || 0;
    const vDesconto = Number(desconto) || 0;
    const taxa = Number(taxa_maquininha) || 0;
    const cPecas = Number(custo_pecas) || 0;
    const cServico = Number(custo_servico) || 0;
    const cBrinde = Number(brinde_custo) || 0;

    const fin = calcularFinanceiro({
      valorFinal: vFinal,
      desconto: vDesconto,
      taxaMaquininha: taxa,
      custoPecas: cPecas,
      custoServico: cServico,
      brindes: cBrinde > 0 ? [{ custo: cBrinde }] : [],
    });

    const novaOS = await queryOne<Record<string, unknown>>(
      `INSERT INTO service_orders (
        numero_os, cliente_id, tipo, status,
        aparelho_marca, aparelho_modelo, aparelho_cor, aparelho_imei,
        acessorios, problema_descrito, diagnostico, servico_realizado,
        garantia_dias, valor_pecas, valor_servico, valor_final,
        desconto, forma_pagamento, parcelas,
        taxa_maquininha, valor_taxa,
        brinde_descricao, brinde_custo,
        custo_pecas, custo_servico, custo_total_os,
        lucro_total_os, margem_lucro_os, valor_recebido,
        leva_traz, endereco_coleta, observacoes
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15, $16,
        $17, $18, $19,
        $20, $21,
        $22, $23,
        $24, $25, $26,
        $27, $28, $29,
        $30, $31, $32
      ) RETURNING *`,
      [
        numero_os,                          // $1
        cliente_id,                         // $2
        'REPARO',                           // $3
        'ABERTA',                           // $4
        aparelho_marca || null,             // $5
        aparelho_modelo || null,            // $6
        aparelho_cor || null,               // $7
        aparelho_imei || null,              // $8
        acessorios || null,                 // $9
        problema_descrito || null,          // $10
        diagnostico || null,                // $11
        servico_realizado || null,          // $12
        Number(garantia_dias) || 90,        // $13
        Number(valor_pecas) || 0,           // $14
        Number(valor_servico) || 0,         // $15
        vFinal,                             // $16
        vDesconto,                          // $17 desconto
        String(forma_pagamento || 'PENDENTE'), // $18
        Number(parcelas) || 1,              // $19
        taxa,                               // $20 taxa_maquininha (interno)
        fin.valorTaxa,                      // $21 valor_taxa (interno)
        brinde_descricao || null,           // $22 (interno)
        cBrinde,                            // $23 (interno)
        cPecas,                             // $24 (interno)
        cServico,                           // $25 (interno)
        fin.custoTotal,                     // $26 (interno)
        fin.lucroTotal,                     // $27 (interno)
        fin.margemLucro,                    // $28 (interno)
        fin.valorRecebido,                  // $29 (interno)
        leva_traz === true || leva_traz === 'true' ? true : false, // $30
        endereco_coleta || null,            // $31
        observacoes || null,                // $32
      ]
    );

    if (!novaOS) {
      res.status(500).json({ error: 'Erro ao criar OS no banco de dados' });
      return;
    }

    // Inserir itens/peças da OS
    if (Array.isArray(itens) && itens.length > 0) {
      for (const item of itens as Array<Record<string, unknown>>) {
        const qtd = Number(item['quantidade'] || 1);
        const preco = Number(item['preco_unitario'] || 0);
        const custo = Number(item['custo_unitario'] || 0);
        const subtotalItem = qtd * preco;
        const custoItem = qtd * custo;
        const descricao = String(item['descricao_manual'] || item['descricao'] || '');
        const catItem = String(item['categoria_item'] || 'PRODUTO');
        const ehBrinde = item['eh_brinde'] === true || item['eh_brinde'] === 'true';
        await query(
          `INSERT INTO itens_os (
            os_id, produto_id, descricao, descricao_manual,
            quantidade, preco_unitario, subtotal, tipo,
            custo_unitario, custo_total, categoria_item, eh_brinde
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            novaOS['id'],
            item['produto_id'] || null,
            descricao,
            descricao,
            qtd,
            preco,
            subtotalItem,
            'PRODUTO',
            custo,
            custoItem,
            catItem,
            ehBrinde,
          ]
        );
      }
    }

    const cliente = await queryOne<{ nome: string; telefone: string }>(
      'SELECT nome, telefone FROM clientes WHERE id = $1', [cliente_id]
    );

    res.status(201).json({ message: 'OS criada com sucesso', data: { ...novaOS, cliente } });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Erro ao criar OS:', errMsg);
    res.status(500).json({ error: 'Erro interno ao criar OS', detalhe: errMsg });
  }
});

// PUT /api/os/:id — Atualizar campos da OS
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      diagnostico, servico_realizado, valor_servico, valor_pecas, valor_final,
      custo_pecas, custo_servico, taxa_maquininha, forma_pagamento, parcelas,
      desconto, brinde_descricao, brinde_custo,
      observacoes, aparelho_marca, aparelho_modelo, aparelho_cor, aparelho_imei,
      acessorios, problema_descrito, garantia_dias,
    } = req.body as Record<string, unknown>;

    // Buscar OS atual para recalcular com valores existentes quando não enviados
    const osAtual = await queryOne<Record<string, unknown>>(
      'SELECT * FROM service_orders WHERE id = $1', [req.params['id']]
    );
    if (!osAtual) { res.status(404).json({ error: 'OS não encontrada' }); return; }

    const vFinal = valor_final != null ? Number(valor_final) : Number(osAtual['valor_final'] || 0);
    const vDesconto = desconto != null ? Number(desconto) : Number(osAtual['desconto'] || 0);
    const taxa = taxa_maquininha != null ? Number(taxa_maquininha) : Number(osAtual['taxa_maquininha'] || 0);
    const cPecas = custo_pecas != null ? Number(custo_pecas) : Number(osAtual['custo_pecas'] || 0);
    const cServico = custo_servico != null ? Number(custo_servico) : Number(osAtual['custo_servico'] || 0);
    const cBrinde = brinde_custo != null ? Number(brinde_custo) : Number(osAtual['brinde_custo'] || 0);

    const fin = calcularFinanceiro({
      valorFinal: vFinal,
      desconto: vDesconto,
      taxaMaquininha: taxa,
      custoPecas: cPecas,
      custoServico: cServico,
      brindes: cBrinde > 0 ? [{ custo: cBrinde }] : [],
    });

    const atualizado = await queryOne<Record<string, unknown>>(
      `UPDATE service_orders SET
        diagnostico       = COALESCE($1, diagnostico),
        servico_realizado = COALESCE($2, servico_realizado),
        valor_servico     = $3,
        valor_pecas       = $4,
        valor_final       = $5,
        desconto          = $6,
        forma_pagamento   = $7,
        parcelas          = $8,
        taxa_maquininha   = $9,
        valor_taxa        = $10,
        brinde_descricao  = $11,
        brinde_custo      = $12,
        custo_pecas       = $13,
        custo_servico     = $14,
        custo_total_os    = $15,
        lucro_total_os    = $16,
        margem_lucro_os   = $17,
        valor_recebido    = $18,
        observacoes       = COALESCE($19, observacoes),
        aparelho_marca    = COALESCE($20, aparelho_marca),
        aparelho_modelo   = COALESCE($21, aparelho_modelo),
        aparelho_cor      = COALESCE($22, aparelho_cor),
        aparelho_imei     = COALESCE($23, aparelho_imei),
        acessorios        = COALESCE($24, acessorios),
        problema_descrito = COALESCE($25, problema_descrito),
        garantia_dias     = COALESCE($26, garantia_dias)
      WHERE id = $27
      RETURNING *`,
      [
        diagnostico || null,
        servico_realizado || null,
        valor_servico != null ? Number(valor_servico) : Number(osAtual['valor_servico'] || 0),
        valor_pecas != null ? Number(valor_pecas) : Number(osAtual['valor_pecas'] || 0),
        vFinal,
        vDesconto,
        forma_pagamento ? String(forma_pagamento) : String(osAtual['forma_pagamento'] || 'PENDENTE'),
        parcelas != null ? Number(parcelas) : Number(osAtual['parcelas'] || 1),
        taxa,
        fin.valorTaxa,
        brinde_descricao !== undefined ? (brinde_descricao || null) : osAtual['brinde_descricao'],
        cBrinde,
        cPecas,
        cServico,
        fin.custoTotal,
        fin.lucroTotal,
        fin.margemLucro,
        fin.valorRecebido,
        observacoes || null,
        aparelho_marca || null,
        aparelho_modelo || null,
        aparelho_cor || null,
        aparelho_imei || null,
        acessorios || null,
        problema_descrito || null,
        garantia_dias ? Number(garantia_dias) : null,
        req.params['id'],
      ]
    );

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
      `UPDATE service_orders SET status = $1${extraSQL} WHERE id = $2 RETURNING *`,
      [status, req.params['id'], ...extraParams]
    );

    if (!atualizado) { res.status(404).json({ error: 'OS não encontrada' }); return; }
    res.json({ message: 'Status atualizado', data: atualizado });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro interno ao atualizar status' });
  }
});

// GET /api/os/financeiro/resumo — Resumo financeiro interno por período
router.get('/financeiro/resumo', async (req: Request, res: Response) => {
  try {
    const { data_inicio, data_fim } = req.query as Record<string, string>;

    let whereClause = `WHERE status NOT IN ('ORCAMENTO_NEGADO')`;
    const params: unknown[] = [];
    let idx = 1;

    if (data_inicio) { whereClause += ` AND data_criacao >= $${idx++}`; params.push(data_inicio); }
    if (data_fim) { whereClause += ` AND data_criacao < ($${idx++}::date + interval '1 day')`; params.push(data_fim); }

    const resumo = await queryOne<Record<string, unknown>>(
      `SELECT
        COUNT(*)                                                              AS total_os,
        COALESCE(SUM(valor_final), 0)                                        AS receita_bruta,
        COALESCE(SUM(desconto), 0)                                           AS total_descontos,
        COALESCE(SUM(valor_taxa), 0)                                         AS total_taxas_maquininha,
        COALESCE(SUM(brinde_custo), 0)                                       AS total_custo_brindes,
        COALESCE(SUM(valor_recebido), 0)                                     AS receita_liquida,
        COALESCE(SUM(custo_total_os), 0)                                     AS custo_total,
        COALESCE(SUM(lucro_total_os), 0)                                     AS lucro_total,
        CASE WHEN SUM(valor_recebido) > 0
          THEN ROUND((SUM(lucro_total_os) / SUM(valor_recebido)) * 100, 2)
          ELSE 0 END                                                          AS margem_media,
        COALESCE(SUM(custo_pecas), 0)                                        AS custo_pecas_total,
        COALESCE(SUM(custo_servico), 0)                                      AS custo_servico_total,
        COALESCE(SUM(CASE WHEN status = 'ENTREGUE' THEN valor_recebido ELSE 0 END), 0) AS faturamento_entregue,
        -- Por forma de pagamento
        COALESCE(SUM(CASE WHEN forma_pagamento IN ('PIX','DINHEIRO') THEN valor_final ELSE 0 END), 0) AS total_avista,
        COALESCE(SUM(CASE WHEN forma_pagamento IN ('CREDITO','DEBITO','PARCELADO') THEN valor_final ELSE 0 END), 0) AS total_cartao
       FROM service_orders ${whereClause}`,
      params
    );

    // Breakdown por categoria (peças vs serviços nos itens)
    const whereItens = whereClause.replace('WHERE ', 'WHERE os.');
    const breakdown = await queryOne<Record<string, unknown>>(
      `SELECT
        COALESCE(SUM(CASE WHEN i.categoria_item = 'PRODUTO' AND NOT COALESCE(i.eh_brinde, false) THEN i.subtotal ELSE 0 END), 0)     AS receita_produtos,
        COALESCE(SUM(CASE WHEN i.categoria_item = 'PRODUTO' AND NOT COALESCE(i.eh_brinde, false) THEN i.custo_total ELSE 0 END), 0)   AS custo_produtos,
        COALESCE(SUM(CASE WHEN i.categoria_item = 'SERVICO' THEN i.subtotal ELSE 0 END), 0)     AS receita_servicos,
        COALESCE(SUM(CASE WHEN i.categoria_item = 'SERVICO' THEN i.custo_total ELSE 0 END), 0)  AS custo_servicos
       FROM itens_os i
       INNER JOIN service_orders os ON i.os_id = os.id
       ${whereItens}`,
      params
    );

    res.json({ data: { ...resumo, ...breakdown } });
  } catch (error) {
    console.error('Erro no resumo financeiro:', error);
    res.status(500).json({ error: 'Erro interno no resumo financeiro' });
  }
});

export default router;
