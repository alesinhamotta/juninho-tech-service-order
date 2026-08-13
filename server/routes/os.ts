// ============================================================================
// ROTAS DE ORDENS DE SERVIÇO — /api/os
// Sistema Juninho Tech OS v2 — Gestão Financeira Completa
// ============================================================================
import { Router, type Request, type Response } from 'express';
import { query, queryOne, queryMany } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { enviarAtualizacaoOS } from '../services/whatsapp.js';

const router = Router();
router.use(authMiddleware);

const STATUS_VALIDOS = [
  'ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO_PECA',
  'PRONTO', 'ENTREGUE', 'SEM_SOLUCAO', 'ORCAMENTO_NEGADO',
];

// Ações operacionais que aparecem para a equipe na tela da OS. Nenhuma delas
// envia WhatsApp neste momento: elas deixam a mensagem preparada na timeline
// para a integração oficial ser ativada somente após validação humana.
const ACOES_RAPIDAS = {
  TECNICO_A_CAMINHO: {
    codigo: 'TECNICO_A_CAMINHO', titulo: 'Técnico a caminho', status: null,
    mensagem: 'Olá, {nome}! O técnico da Juninho Tech já está a caminho para realizar o atendimento combinado.',
  },
  APARELHO_COLETADO: {
    codigo: 'APARELHO_COLETADO', titulo: 'Aparelho coletado com segurança', status: 'EM_ANDAMENTO',
    mensagem: 'Olá, {nome}! Seu aparelho foi coletado com segurança. Assim que a análise ou o serviço for iniciado, avisaremos por aqui.',
  },
  ANALISE_CONCLUIDA: {
    codigo: 'ANALISE_CONCLUIDA', titulo: 'Análise concluída', status: null,
    mensagem: 'Olá, {nome}! A análise do seu aparelho foi concluída. Em breve enviaremos o orçamento detalhado para sua aprovação.',
  },
  SERVICO_INICIADO: {
    codigo: 'SERVICO_INICIADO', titulo: 'Serviço iniciado', status: 'EM_ANDAMENTO',
    mensagem: 'Olá, {nome}! O serviço no seu aparelho foi iniciado pela nossa equipe técnica.',
  },
  SERVICO_CONCLUIDO: {
    codigo: 'SERVICO_CONCLUIDO', titulo: 'Serviço concluído', status: 'PRONTO',
    mensagem: 'Olá, {nome}! Seu aparelho está pronto. Estamos conferindo todos os detalhes antes da entrega.',
  },
  SAINDO_PARA_ENTREGA: {
    codigo: 'SAINDO_PARA_ENTREGA', titulo: 'Saindo para entrega', status: 'PRONTO',
    mensagem: 'Olá, {nome}! Seu aparelho está a caminho da entrega. Em breve ele estará com você.',
  },
  ENTREGUE: {
    codigo: 'ENTREGUE', titulo: 'Aparelho entregue', status: 'ENTREGUE',
    mensagem: 'Olá, {nome}! Confirmamos a entrega do seu aparelho. Obrigado por confiar na Juninho Tech!',
  },
} as const;

type AcaoRapida = keyof typeof ACOES_RAPIDAS;

type EventoInput = {
  osId: string;
  codigo: string;
  titulo: string;
  mensagemCliente?: string | null;
  status?: string | null;
  notificar?: boolean;
  notificacaoStatus?: 'PENDENTE' | 'ENVIADO' | 'NAO_ENVIAR' | 'ERRO';
  criadoPor?: string | null;
};

async function registrarEvento(evento: EventoInput) {
  return queryOne<Record<string, unknown>>(
    `INSERT INTO os_eventos (
      os_id, codigo, titulo, mensagem_cliente, status_os,
      notificar_whatsapp, notificacao_status, criado_por
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      evento.osId, evento.codigo, evento.titulo, evento.mensagemCliente || null,
      evento.status || null, evento.notificar ?? true,
      evento.notificacaoStatus || (evento.notificar === false ? 'NAO_ENVIAR' : 'PENDENTE'),
      evento.criadoPor || null,
    ]
  );
}

function labelStatus(status: string) {
  const labels: Record<string, string> = {
    ABERTA: 'OS aberta', EM_ANDAMENTO: 'Serviço em andamento',
    AGUARDANDO_PECA: 'Aguardando peça', PRONTO: 'Serviço pronto',
    ENTREGUE: 'Aparelho entregue', SEM_SOLUCAO: 'Sem solução',
    ORCAMENTO_NEGADO: 'Orçamento negado',
  };
  return labels[status] || status;
}

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

  // Valor que o cliente paga (após desconto)
  const valorComDesconto = Math.max(0, valorFinal - desconto);

  // Taxa da maquininha sobre o valor com desconto
  const taxaValor = parseFloat(((valorComDesconto * taxaMaquininha) / 100).toFixed(2));

  // Valor que o técnico efetivamente recebe (após taxa)
  const valorRecebidoLiquido = parseFloat((valorComDesconto - taxaValor).toFixed(2));

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
        os.status_pagamento, os.pago_em,
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

    const [evidencias, assinaturas, eventos] = await Promise.all([
      queryMany<Record<string, unknown>>(
        `SELECT id, etapa, titulo, arquivo_url, mime_type, criado_por, data_criacao
         FROM os_evidencias WHERE os_id = $1 ORDER BY data_criacao ASC`,
        [os['id']]
      ),
      queryMany<Record<string, unknown>>(
        `SELECT id, tipo, nome_signatario, assinatura_data_url, aceite_termos, data_assinatura
         FROM os_assinaturas WHERE os_id = $1 ORDER BY data_assinatura ASC`,
        [os['id']]
      ),
      queryMany<Record<string, unknown>>(
        `SELECT id, codigo, titulo, mensagem_cliente, status_os,
                notificar_whatsapp, notificacao_status, whatsapp_message_id,
                notificacao_erro, notificado_em, criado_por, data_evento
         FROM os_eventos WHERE os_id = $1 ORDER BY data_evento DESC`,
        [os['id']]
      ),
    ]);

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
        evidencias,
        assinaturas,
        eventos,
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
      descricao_brinde, brinde_descricao, custo_brinde,
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
    const descBrinde = String(descricao_brinde || brinde_descricao || '');

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
        status_pagamento,
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
        $29,
        $30, $31, $32
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
        String(forma_pagamento || 'PENDENTE'), // $18
        Number(parcelas) || 1,              // $19
        taxa,                               // $20 taxa_maquininha %
        fin.taxaValor,                      // $21 taxa_maquininha_valor R$
        descBrinde || null,                 // $22
        cBrinde,                            // $23
        cServico,                           // $24 custo_servico
        fin.custoTotal,                     // $25 custo_total
        fin.lucroLiquido,                   // $26 lucro_liquido
        fin.margemPercentual,               // $27 margem_percentual
        fin.valorRecebidoLiquido,           // $28 valor_recebido_liquido
        'A_RECEBER',                        // $29 status_pagamento padrão
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
        const descricao = String(item['descricao_manual'] || item['descricao'] || item['nome'] || '');
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

    await registrarEvento({
      osId: String(novaOS['id']),
      codigo: 'OS_CRIADA',
      titulo: 'Ordem de serviço criada',
      mensagemCliente: 'Recebemos sua solicitação e sua ordem de serviço foi registrada.',
      status: 'ABERTA',
      notificar: false,
      criadoPor: 'Sistema',
    });

    res.status(201).json({ message: 'OS criada com sucesso', data: { ...novaOS, cliente } });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Erro ao criar OS:', errMsg);
    res.status(500).json({ error: 'Erro interno ao criar OS', detalhe: errMsg });
  }
});

// POST /api/os/:id/evidencias — Salvar foto ou evidência do equipamento
router.post('/:id/evidencias', async (req: Request, res: Response) => {
  try {
    const { etapa, titulo, arquivo_url, mime_type, criado_por } = req.body as Record<string, unknown>;
    const etapaNormalizada = String(etapa || '').toUpperCase();
    const arquivo = String(arquivo_url || '');

    if (!['ANTES', 'DEPOIS', 'OUTRO'].includes(etapaNormalizada)) {
      res.status(400).json({ error: 'Etapa deve ser ANTES, DEPOIS ou OUTRO.' });
      return;
    }
    if (!arquivo || (!arquivo.startsWith('data:image/') && !/^https?:\/\//i.test(arquivo))) {
      res.status(400).json({ error: 'Envie uma imagem válida ou uma URL HTTPS.' });
      return;
    }
    if (arquivo.startsWith('data:image/') && arquivo.length > 3_500_000) {
      res.status(413).json({ error: 'A foto ficou grande demais. Tente uma imagem menor.' });
      return;
    }

    const evidencia = await queryOne<Record<string, unknown>>(
      `INSERT INTO os_evidencias (os_id, etapa, titulo, arquivo_url, mime_type, criado_por)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params['id'], etapaNormalizada, String(titulo || ''), arquivo, String(mime_type || ''), String(criado_por || '')]
    );

    if (!evidencia) { res.status(500).json({ error: 'Não foi possível salvar a evidência.' }); return; }
    await registrarEvento({
      osId: req.params['id'], codigo: `FOTO_${etapaNormalizada}`,
      titulo: `Foto ${etapaNormalizada.toLowerCase()} registrada`,
      notificar: false,
    });
    res.status(201).json({ message: 'Evidência salva com sucesso', data: evidencia });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Erro ao salvar evidência:', errMsg);
    res.status(500).json({ error: 'Erro interno ao salvar evidência', detalhe: errMsg });
  }
});

// POST /api/os/:id/assinaturas — Salvar aceite capturado na tela
router.post('/:id/assinaturas', async (req: Request, res: Response) => {
  try {
    const { tipo, nome_signatario, assinatura_data_url, aceite_termos } = req.body as Record<string, unknown>;
    const tipoNormalizado = String(tipo || '').toUpperCase();
    const assinatura = String(assinatura_data_url || '');

    if (!['COLETA', 'APROVACAO', 'ENTREGA'].includes(tipoNormalizado)) {
      res.status(400).json({ error: 'Tipo deve ser COLETA, APROVACAO ou ENTREGA.' });
      return;
    }
    if (!String(nome_signatario || '').trim() || !assinatura.startsWith('data:image/')) {
      res.status(400).json({ error: 'Informe o nome e capture uma assinatura válida.' });
      return;
    }
    if (assinatura.length > 1_500_000) {
      res.status(413).json({ error: 'A assinatura ficou grande demais. Tente assinar novamente.' });
      return;
    }

    const assinaturaSalva = await queryOne<Record<string, unknown>>(
      `INSERT INTO os_assinaturas (os_id, tipo, nome_signatario, assinatura_data_url, aceite_termos)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (os_id, tipo) DO UPDATE SET
         nome_signatario = EXCLUDED.nome_signatario,
         assinatura_data_url = EXCLUDED.assinatura_data_url,
         aceite_termos = EXCLUDED.aceite_termos,
         data_assinatura = NOW()
       RETURNING *`,
      [req.params['id'], tipoNormalizado, String(nome_signatario).trim(), assinatura, aceite_termos === true]
    );

    await registrarEvento({
      osId: req.params['id'], codigo: `ASSINATURA_${tipoNormalizado}`,
      titulo: `Assinatura de ${tipoNormalizado.toLowerCase()} registrada`, notificar: false,
    });
    res.status(201).json({ message: 'Assinatura salva com sucesso', data: assinaturaSalva });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Erro ao salvar assinatura:', errMsg);
    res.status(500).json({ error: 'Erro interno ao salvar assinatura', detalhe: errMsg });
  }
});

// POST /api/os/:id/acoes — Registrar uma ação operacional e deixar o WhatsApp pendente
router.post('/:id/acoes', async (req: Request, res: Response) => {
  try {
    const { acao, criado_por, nao_notificar } = req.body as Record<string, unknown>;
    const chave = String(acao || '') as AcaoRapida;
    const config = ACOES_RAPIDAS[chave];
    if (!config) {
      res.status(400).json({ error: `Ação inválida. Use: ${Object.keys(ACOES_RAPIDAS).join(', ')}` });
      return;
    }

    const osAtual = await queryOne<Record<string, unknown>>(
      `SELECT os.id, os.numero_os, os.status, c.nome AS cliente_nome, c.telefone AS cliente_telefone
       FROM service_orders os LEFT JOIN clientes c ON c.id = os.cliente_id WHERE os.id = $1`,
      [req.params['id']]
    );
    if (!osAtual) { res.status(404).json({ error: 'OS não encontrada' }); return; }

    const statusDestino = config.status || String(osAtual['status']);
    if (config.status && config.status !== osAtual['status']) {
      let updateSql = 'UPDATE service_orders SET status = $1, data_atualizacao = NOW()';
      if (config.status === 'PRONTO') updateSql += ', data_conclusao = COALESCE(data_conclusao, NOW())';
      if (config.status === 'ENTREGUE') updateSql += ', data_entrega = COALESCE(data_entrega, NOW())';
      updateSql += ' WHERE id = $2';
      await query(updateSql, [config.status, req.params['id']]);
    }

    const nome = String(osAtual['cliente_nome'] || 'cliente').split(' ')[0];
    const mensagem = config.mensagem.replace('{nome}', nome);
    const notificar = nao_notificar !== true;
    const evento = await registrarEvento({
      osId: req.params['id'], codigo: config.codigo, titulo: config.titulo,
      mensagemCliente: mensagem, status: statusDestino, notificar,
      criadoPor: String(criado_por || ''),
    });

    res.status(201).json({
      message: 'Ação registrada. A mensagem ficará pendente até a integração oficial do WhatsApp ser ativada.',
      data: { evento, mensagem_cliente: mensagem, telefone: osAtual['cliente_telefone'], status: statusDestino },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Erro ao registrar ação da OS:', errMsg);
    res.status(500).json({ error: 'Erro interno ao registrar ação', detalhe: errMsg });
  }
});

// POST /api/os/:id/eventos/:eventoId/enviar-whatsapp — Envio manual, rastreável e sem texto livre.
router.post('/:id/eventos/:eventoId/enviar-whatsapp', async (req: Request, res: Response) => {
  try {
    const evento = await queryOne<Record<string, unknown>>(
      `SELECT ev.id, ev.os_id, ev.codigo, ev.titulo, ev.mensagem_cliente,
              ev.notificar_whatsapp, ev.notificacao_status,
              os.numero_os, c.nome AS cliente_nome, c.telefone AS cliente_telefone
       FROM os_eventos ev
       INNER JOIN service_orders os ON os.id = ev.os_id
       LEFT JOIN clientes c ON c.id = os.cliente_id
       WHERE ev.id = $1 AND ev.os_id = $2`,
      [req.params['eventoId'], req.params['id']]
    );

    if (!evento) { res.status(404).json({ error: 'Evento da OS não encontrado.' }); return; }
    if (evento['notificar_whatsapp'] !== true) {
      res.status(400).json({ error: 'Este evento foi marcado para não notificar o cliente.' }); return;
    }
    if (evento['notificacao_status'] === 'ENVIADO') {
      res.status(409).json({ error: 'Esta atualização já foi enviada ao WhatsApp.' }); return;
    }
    if (!evento['cliente_telefone']) {
      res.status(400).json({ error: 'Cadastre um WhatsApp válido para este cliente antes de enviar.' }); return;
    }
    if (!evento['mensagem_cliente']) {
      res.status(400).json({ error: 'Este evento não possui uma mensagem autorizada para o cliente.' }); return;
    }

    try {
      const resultado = await enviarAtualizacaoOS({
        telefone: String(evento['cliente_telefone']),
        nomeCliente: String(evento['cliente_nome'] || 'cliente').split(' ')[0],
        numeroOS: String(evento['numero_os']),
        mensagem: String(evento['mensagem_cliente']),
      });

      await query(
        `UPDATE os_eventos
         SET notificacao_status = 'ENVIADO', whatsapp_message_id = $1,
             notificacao_erro = NULL, notificado_em = NOW()
         WHERE id = $2`,
        [resultado.messageId, evento['id']]
      );

      res.json({
        message: 'Atualização enviada ao WhatsApp e registrada na linha do tempo.',
        data: { evento_id: evento['id'], whatsapp_message_id: resultado.messageId, telefone: resultado.telefone },
      });
    } catch (envioErro) {
      const detalhe = envioErro instanceof Error ? envioErro.message : 'Erro desconhecido ao enviar atualização.';
      await query(
        `UPDATE os_eventos SET notificacao_status = 'ERRO', notificacao_erro = $1 WHERE id = $2`,
        [detalhe.slice(0, 1000), evento['id']]
      );
      res.status(400).json({ error: 'A atualização não foi enviada. Revise a configuração do WhatsApp e tente novamente.', detalhe });
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Erro ao enviar atualização para WhatsApp:', errMsg);
    res.status(500).json({ error: 'Erro interno ao preparar a atualização do WhatsApp.' });
  }
});

// PUT /api/os/:id — Atualizar campos da OS
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      diagnostico, servico_realizado, valor_servico, valor_pecas, valor_final,
      custo_pecas, custo_servico, taxa_maquininha, forma_pagamento, parcelas,
      desconto, descricao_brinde, brinde_descricao, custo_brinde,
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
    const descBrinde = String(descricao_brinde || brinde_descricao || osAtual['descricao_brinde'] || '');

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
        String(forma_pagamento || osAtual['forma_pagamento'] || 'PENDENTE'),
        Number(parcelas) || Number(osAtual['parcelas'] || 1),
        taxa,
        fin.taxaValor,
        descBrinde || null,
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
    const { status, criado_por } = req.body as { status: string; criado_por?: string };

    if (!status) {
      res.status(400).json({ error: 'Campo status é obrigatório' });
      return;
    }

    if (!STATUS_VALIDOS.includes(status)) {
      res.status(400).json({ error: `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}` });
      return;
    }

    // Verifica se a coluna data_atualizacao existe antes de tentar usar
    let sql = `UPDATE service_orders SET status = $1`;
    const params: unknown[] = [status];

    // Tenta atualizar data_atualizacao se existir
    try {
      sql += `, data_atualizacao = NOW()`;
    } catch (_) {
      // ignora se não existir
    }

    sql += ` WHERE id = $2 RETURNING id, numero_os, status`;
    params.push(req.params['id']);

    const atualizado = await queryOne(sql, params);

    if (!atualizado) {
      res.status(404).json({ error: 'OS não encontrada' });
      return;
    }

    await registrarEvento({
      osId: req.params['id'],
      codigo: `STATUS_${status}`,
      titulo: labelStatus(status),
      status,
      notificar: false,
      criadoPor: criado_por || null,
    });

    res.json({ message: 'Status atualizado com sucesso', data: atualizado });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Erro ao atualizar status:', errMsg);
    res.status(500).json({ error: 'Erro interno ao atualizar status', detalhe: errMsg });
  }
});

// PATCH /api/os/:id/pagamento — Confirmar pagamento (A_RECEBER → PAGO)
router.patch('/:id/pagamento', async (req: Request, res: Response) => {
  try {
    const { status_pagamento, forma_pagamento, parcelas } = req.body as Record<string, unknown>;

    const statusValidos = ['A_RECEBER', 'PAGO'];
    const statusPag = String(status_pagamento || 'PAGO');

    if (!statusValidos.includes(statusPag)) {
      res.status(400).json({ error: 'status_pagamento deve ser A_RECEBER ou PAGO' });
      return;
    }

    const pagoEm = statusPag === 'PAGO' ? new Date().toISOString() : null;

    const updates: string[] = ['status_pagamento = $1', 'pago_em = $2'];
    const params: unknown[] = [statusPag, pagoEm];
    let idx = 3;

    if (forma_pagamento) {
      updates.push(`forma_pagamento = $${idx++}`);
      params.push(String(forma_pagamento));
    }
    if (parcelas) {
      updates.push(`parcelas = $${idx++}`);
      params.push(Number(parcelas));
    }

    params.push(req.params['id']);
    const sql = `UPDATE service_orders SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, numero_os, status, status_pagamento, pago_em, forma_pagamento, parcelas`;

    const atualizado = await queryOne(sql, params);

    if (!atualizado) {
      res.status(404).json({ error: 'OS não encontrada' });
      return;
    }

    res.json({ message: `Pagamento marcado como ${statusPag}`, data: atualizado });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Erro ao atualizar pagamento:', errMsg);
    res.status(500).json({ error: 'Erro interno ao atualizar pagamento', detalhe: errMsg });
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
