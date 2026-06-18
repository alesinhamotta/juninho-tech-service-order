-- ============================================================================
-- MIGRAÇÃO v5 — Colunas de Status de Pagamento
-- Sistema Juninho Tech OS
-- Execute este script no SQL Editor do Neon (neon.tech)
-- ============================================================================

-- Adicionar status de pagamento (A_RECEBER ou PAGO)
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS status_pagamento VARCHAR(20) DEFAULT 'A_RECEBER';
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS pago_em TIMESTAMP WITH TIME ZONE;

-- Garantir que OS existentes tenham o valor padrão
UPDATE service_orders SET status_pagamento = 'A_RECEBER' WHERE status_pagamento IS NULL;

-- Adicionar colunas que podem estar faltando na itens_os
ALTER TABLE itens_os ADD COLUMN IF NOT EXISTS descricao      VARCHAR(255);
ALTER TABLE itens_os ADD COLUMN IF NOT EXISTS subtotal       NUMERIC(10,2) DEFAULT 0;
ALTER TABLE itens_os ADD COLUMN IF NOT EXISTS tipo           VARCHAR(20) DEFAULT 'PRODUTO';
ALTER TABLE itens_os ADD COLUMN IF NOT EXISTS custo_unitario NUMERIC(10,2) DEFAULT 0;
ALTER TABLE itens_os ADD COLUMN IF NOT EXISTS custo_total    NUMERIC(10,2) DEFAULT 0;
ALTER TABLE itens_os ADD COLUMN IF NOT EXISTS categoria_item VARCHAR(20) DEFAULT 'PRODUTO';
ALTER TABLE itens_os ADD COLUMN IF NOT EXISTS eh_brinde      BOOLEAN DEFAULT FALSE;

-- Verificar se data_atualizacao existe na service_orders
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW();

SELECT 'Migracao v5 (status_pagamento + pago_em + itens_os) aplicada com sucesso!' AS resultado;
