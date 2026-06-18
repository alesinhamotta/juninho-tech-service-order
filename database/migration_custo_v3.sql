-- ============================================================================
-- MIGRAÇÃO v3 — Campos de Custo Interno (Gestão Financeira)
-- Execute este script no SQL Editor do Neon
-- ============================================================================

-- 1. Adicionar custo_unitario em itens_os
--    (custo que o técnico pagou pela peça/serviço — NUNCA aparece para o cliente)
ALTER TABLE itens_os
  ADD COLUMN IF NOT EXISTS custo_unitario NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_total    NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS categoria_item VARCHAR(20) DEFAULT 'PRODUTO'
    CHECK (categoria_item IN ('PRODUTO','SERVICO'));

-- 2. Adicionar campos de custo e lucro na service_orders
--    (totais calculados automaticamente — NUNCA aparecem para o cliente)
ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS custo_total_os   NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lucro_total_os   NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margem_lucro_os  NUMERIC(5,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_pecas      NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_servico    NUMERIC(10,2) DEFAULT 0;

-- 3. Atualizar registros existentes (custo = 0 para OS já criadas)
UPDATE itens_os SET custo_unitario = 0, custo_total = 0 WHERE custo_unitario IS NULL;
UPDATE service_orders SET custo_total_os = 0, lucro_total_os = 0, margem_lucro_os = 0 WHERE custo_total_os IS NULL;

SELECT 'Migracao v3 (custo interno) aplicada com sucesso!' AS resultado;
