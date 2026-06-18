-- ============================================================================
-- MIGRAÇÃO v4 — Gestão Financeira Completa
-- Campos: taxa maquininha, brinde, desconto, forma de pagamento, parcelas
-- Execute este script no SQL Editor do Neon
-- ============================================================================

-- 1. Campos financeiros na tabela service_orders
ALTER TABLE service_orders
  -- Pagamento
  ADD COLUMN IF NOT EXISTS forma_pagamento    VARCHAR(20) DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS parcelas           INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS data_pagamento     TIMESTAMP WITH TIME ZONE,

  -- Taxa da maquininha (% que vai para a operadora — interno)
  ADD COLUMN IF NOT EXISTS taxa_maquininha    NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_taxa         NUMERIC(10,2) DEFAULT 0,

  -- Desconto manual (visível ao cliente no PDF)
  ADD COLUMN IF NOT EXISTS desconto           NUMERIC(10,2) DEFAULT 0,

  -- Brinde (custo interno — NUNCA aparece para o cliente)
  ADD COLUMN IF NOT EXISTS brinde_descricao   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS brinde_custo       NUMERIC(10,2) DEFAULT 0,

  -- Campos de custo interno (da migração v3 — idempotente)
  ADD COLUMN IF NOT EXISTS custo_total_os     NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lucro_total_os     NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margem_lucro_os    NUMERIC(5,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_pecas        NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_servico      NUMERIC(10,2) DEFAULT 0,

  -- Valor que o técnico efetivamente recebe (após taxa da maquininha)
  ADD COLUMN IF NOT EXISTS valor_recebido     NUMERIC(10,2) DEFAULT 0;

-- 2. Campos de custo nos itens (da migração v3 — idempotente)
ALTER TABLE itens_os
  ADD COLUMN IF NOT EXISTS custo_unitario     NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_total        NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS categoria_item     VARCHAR(20)   DEFAULT 'PRODUTO',
  ADD COLUMN IF NOT EXISTS descricao_manual   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS eh_brinde          BOOLEAN DEFAULT false;

-- 3. Atualizar constraint de forma_pagamento
ALTER TABLE service_orders DROP CONSTRAINT IF EXISTS service_orders_forma_pagamento_check;
ALTER TABLE service_orders ADD CONSTRAINT service_orders_forma_pagamento_check
  CHECK (forma_pagamento IN ('DINHEIRO','PIX','CREDITO','DEBITO','PARCELADO','PENDENTE'));

-- 4. Atualizar constraint de status (idempotente)
ALTER TABLE service_orders DROP CONSTRAINT IF EXISTS service_orders_status_check;
UPDATE service_orders SET status = 'ABERTA'       WHERE status = 'PENDENTE';
UPDATE service_orders SET status = 'EM_ANDAMENTO' WHERE status = 'APROVADO';
UPDATE service_orders SET status = 'PRONTO'       WHERE status = 'CONCLUIDO';
UPDATE service_orders SET status = 'ENTREGUE'     WHERE status = 'PAGO';
UPDATE service_orders SET status = 'SEM_SOLUCAO'  WHERE status = 'CANCELADO';
ALTER TABLE service_orders ADD CONSTRAINT service_orders_status_check
  CHECK (status IN ('ABERTA','EM_ANDAMENTO','AGUARDANDO_PECA','PRONTO','ENTREGUE','SEM_SOLUCAO','ORCAMENTO_NEGADO'));

-- 5. Inicializar valores nulos
UPDATE service_orders SET
  taxa_maquininha = 0, valor_taxa = 0, desconto = 0,
  brinde_custo = 0, custo_total_os = 0, lucro_total_os = 0,
  margem_lucro_os = 0, custo_pecas = 0, custo_servico = 0,
  valor_recebido = COALESCE(valor_final, 0),
  forma_pagamento = COALESCE(forma_pagamento, 'PENDENTE'),
  parcelas = COALESCE(parcelas, 1)
WHERE taxa_maquininha IS NULL OR valor_recebido IS NULL;

UPDATE itens_os SET
  custo_unitario = 0, custo_total = 0, eh_brinde = false
WHERE custo_unitario IS NULL;

SELECT 'Migracao v4 (financeiro completo) aplicada com sucesso!' AS resultado;
