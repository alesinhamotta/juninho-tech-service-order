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
  custoBrinde: number;
}) {
  const { valorFinal, desconto, taxaMaquininha, custoPecas, custoServico, custoBrinde } = params;

  // Valor que o cliente paga (já inclui o acréscimo do cartão se houver)
  const valorBruto = valorFinal - desconto;

  // Taxa da maquininha sobre o valor bruto
  const taxaValor = parseFloat(((valorBruto * taxaMaquininha) / 100).toFixed(2));

  // Valor que o técnico efetivamente recebe (após taxa)
  const valorRecebidoLiquido = parseFloat((valorBruto - taxaValor).toFixed(2));

  // Custo total = peças + serviço + brindes
  const custoTotal = parseFloat((custoPecas + custoServico + custoBrinde).toFixed(2));

  // Lucro líquido = valor recebido - custo total
  const lucroLiquido = parseFloat((valorRecebidoLiquido - custoTotal).toFixed(2));

  // Margem = lucro / valor recebido * 100
  const margemPercentual = valorRecebidoLiquido > 0
    ? parseFloat(((lucroLiquido / valorRecebidoLiquido) * 100).toFixed(2))
    : 0;

  return { taxaValor, valorRecebidoLiquido, custoTotal, lucroLiquido, margemPercentual };
}

// GET /api/os — Listar OS com filtros
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, search, data_inicio, data_fim, limit } = req.query as Record<string, string>;

    let sql = `
      SELECT
        os.id, os.numero_os, os.status, os.aparelho_marca, os.aparelho_modelo,
        os.valor_final, os.desconto, os.forma_pagamento, os.parcelas,
        os.custo_total, os.lucro_liquido, os.margem_percentual, os.valor_recebido_liquido,
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
      descricao_brinde, custo_brinde,
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
    const cBrinde = Number(custo_brinde) || 0;

    const fin = calcularFinanceiro({
      valorFinal: vFinal,
      desconto: vDesconto,
      taxaMaquininha: taxa,
      custoPecas: cPecas,
      custoServico: cServico,
      custoBrinde: cBrinde,
    });

    // Colunas exatamente como existem no banco após as migrações
    const novaOS = await queryOne<Record<string, unknown>>(
      `INSERT INTO service_orders (
        numero_os, cliente_id, tipo, status,
        aparelho_marca, aparelho_modelo, aparelho_cor, aparelho_imei,
        acessorios, problema_descrito, diagnostico, servico_realizado,
        garantia_dias, valor_pecas, valor_servico, valor_final,
        desconto, forma_pagamento, parcelas,
        taxa_maquininha, taxa_maquininha_valor,
        descricao_brinde, custo_brinde,
        custo_servico, custo_total,
        lucro_liquido, margem_percentual, valor_recebido_liquido,
        leva_traz, endereco_coleta, observacoes
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15, $16,
        $17, $18, $19,
        $20, $21,
        $22, $23,
        $24, $25,
        $26, $27, $28,
        $29, $30, $31
      ) RETURNING *`,
      [
        numero_os,                          // $1
        cliente_id,                         // $2
        'REPARO',                           // $3 tipo (NOT NULL legado)
        'ABERTA',                           // $4 status
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
        vDesconto,                          // $17
        String(forma_pagamento || 'PIX'),   // $18
        Number(parcelas) || 1,              // $19
        taxa,                               // $20 taxa_maquininha %
        fin.taxaValor,                      // $21 taxa_maquininha_valor R$
        descricao_brinde || null,           // $22
        cBrinde,                            // $23
        cServico,                           // $24 custo_servico
        fin.custoTotal,                     // $25 custo_total
        fin.lucroLiquido,                   // $26 lucro_liquido
        fin.margemPercentual,               // $27 margem_percentual
        fin.valorRecebidoLiquido,           // $28 valor_recebido_liquido
        leva_traz === true || leva_traz === 'true' ? true : false, // $29
        endereco_coleta || null,            // $30
        observacoes || null,                // $31
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
      desconto, descricao_brinde, custo_brinde,
      observacoes, aparelho_marca, aparelho_modelo, aparelho_cor, aparelho_imei,
      acessorios, problema_descrito, garantia_dias,
    } = req.body as Record<string, unknown>;

    const osAtual = await queryOne<Record<string, unknown>>(
      'SELECT * FROM service_orders WHERE id = $1', [req.params['id']]
    );
    if (!osAtual) { res.status(404).json({ error: 'OS não encontrada' }); return; }

    const vFinal = valor_final != null ? Number(valor_final) : Number(osAtual['valor_final'] || 0);
    const vDesconto = desconto != null ? Number(desconto) : Number(osAtual['desconto'] || 0);
    const taxa = taxa_maquininha != null ? Number(taxa_maquininha) : Number(osAtual['taxa_maquininha'] || 0);
    const cPecas = custo_pecas != null ? Number(custo_pecas) : Number(osAtual['custo_pecas'] || 0);
    const cServico = custo_servico != null ? Number(custo_servico) : Number(osAtual['custo_servico'] || 0);
    const cBrinde = custo_brinde != null ? Number(custo_brinde) : Number(osAtual['custo_brinde'] || 0);

    const fin = calcularFinanceiro({
      valorFinal: vFinal,
      desconto: vDesconto,
      taxaMaquininha: taxa,
      custoPecas: cPecas,
      custoServico: cServico,
      custoBrinde: cBrinde,
    });

    const atualizado = await queryOne<Record<string, unknown>>(
      `UPDATE service_orders SET
        diagnostico           = COALESCE($1, diagnostico),
        servico_realizado     = COALESCE($2, servico_realizado),
        valor_servico         = $3,
        valor_pecas           = $4,
        valor_final           = $5,
        desconto              = $6,
        forma_pagamento       = $7,
        parcelas              = $8,
        taxa_maquininha       = $9,
        taxa_maquininha_valor = $10,
        descricao_brinde      = $11,
        custo_brinde          = $12,
        custo_servico         = $13,
        custo_total           = $14,
        lucro_liquido         = $15,
        margem_percentual     = $16,
        valor_recebido_liquido= $17,
        observacoes           = COALESCE($18, observacoes),
        aparelho_marca        = COALESCE($19, aparelho_marca),
        aparelho_modelo       = COALESCE($20, aparelho_modelo),
        aparelho_cor          = COALESCE($21, aparelho_cor),
        aparelho_imei         = COALESCE($22, aparelho_imei),
        acessorios            = COALESCE($23, acessorios),
        problema_descrito     = COALESCE($24, problema_descrito),
        garantia_dias         = COALESCE($25, garantia_dias),
        data_atualizacao      = NOW()
      WHERE id = $26 RETURNING *`,
      [
        diagnostico || null,
        servico_realizado || null,
        Number(valor_servico) || Number(osAtual['valor_servico'] || 0),
        Number(valor_pecas) || Number(osAtual['valor_pecas'] || 0),
        vFinal,
        vDesconto,
        String(forma_pagamento || osAtual['forma_pagamento'] || 'PIX'),
        Number(parcelas) || Number(osAtual['parcelas'] || 1),
        taxa,
        fin.taxaValor,
        descricao_brinde || osAtual['descricao_brinde'] || null,
        cBrinde,
        cServico,
        fin.custoTotal,
        fin.lucroLiquido,
        fin.margemPercentual,
        fin.valorRecebidoLiquido,
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

    res.json({ message: 'OS atualizada com sucesso', data: atualizado });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Erro ao atualizar OS:', errMsg);
    res.status(500).json({ error: 'Erro interno ao atualizar OS', detalhe: errMsg });
  }
});

// PATCH /api/os/:id/status — Atualizar apenas o status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body as { status: string };
    if (!STATUS_VALIDOS.includes(status)) {
      res.status(400).json({ error: `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}` });
      return;
    }
    const atualizado = await queryOne(
      `UPDATE service_orders SET status = $1, data_atualizacao = NOW() WHERE id = $2 RETURNING id, numero_os, status`,
      [status, req.params['id']]
    );
    if (!atualizado) { res.status(404).json({ error: 'OS não encontrada' }); return; }
    res.json({ message: 'Status atualizado com sucesso', data: atualizado });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro interno ao atualizar status' });
  }
});

// DELETE /api/os/:id — Excluir OS
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await query('DELETE FROM itens_os WHERE os_id = $1', [req.params['id']]);
    const deletado = await queryOne(
      'DELETE FROM service_orders WHERE id = $1 RETURNING id, numero_os',
      [req.params['id']]
    );
    if (!deletado) { res.status(404).json({ error: 'OS não encontrada' }); return; }
    res.json({ message: 'OS excluída com sucesso', data: deletado });
  } catch (error) {
    console.error('Erro ao excluir OS:', error);
    res.status(500).json({ error: 'Erro interno ao excluir OS' });
  }
});

export default router;
