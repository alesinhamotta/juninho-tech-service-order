-- ============================================================================
-- SCHEMA DO BANCO DE DADOS - JUNINHO.TECH Service Order System
-- Banco: Neon Postgres (PostgreSQL 18)
-- Execute este script no SQL Editor do console.neon.tech
-- ============================================================================

-- Extensão para gerar UUIDs automaticamente
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABELA: usuarios (técnicos que acessam o sistema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  nome          VARCHAR(255) NOT NULL,
  senha_hash    TEXT NOT NULL,
  ativo         BOOLEAN DEFAULT true,
  data_criacao  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ultimo_login  TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- TABELA: clientes
-- ============================================================================
CREATE TABLE IF NOT EXISTS clientes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         VARCHAR(255) NOT NULL,
  telefone     VARCHAR(20) NOT NULL UNIQUE,  -- WhatsApp / telefone principal
  email        VARCHAR(255),
  endereco     TEXT,                          -- Endereço completo (para leva e traz)
  bairro       VARCHAR(100),
  cidade       VARCHAR(100),
  estado       VARCHAR(2),
  cep          VARCHAR(10),
  observacoes  TEXT,
  ativo        BOOLEAN DEFAULT true,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABELA: produtos (peças e acessórios)
-- ============================================================================
CREATE TABLE IF NOT EXISTS produtos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            VARCHAR(255) NOT NULL,
  categoria       VARCHAR(100) NOT NULL,   -- Ex: Tela, Bateria, Conector, Cabo
  marca           VARCHAR(100),
  modelo          VARCHAR(100),
  descricao       TEXT,
  preco_custo     NUMERIC(10,2),
  preco_venda     NUMERIC(10,2) NOT NULL,
  estoque         INTEGER DEFAULT 0,
  estoque_minimo  INTEGER DEFAULT 5,
  ativo           BOOLEAN DEFAULT true,
  data_criacao    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABELA: service_orders (ordens de serviço)
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_os        VARCHAR(30) NOT NULL UNIQUE,  -- Ex: OS-20260608-0001
  cliente_id       UUID NOT NULL REFERENCES clientes(id),

  -- Tipo e Status
  tipo             VARCHAR(20) NOT NULL CHECK (tipo IN ('ORCAMENTO', 'VENDA', 'REPARO')),
  status           VARCHAR(20) NOT NULL DEFAULT 'PENDENTE'
                     CHECK (status IN ('PENDENTE', 'APROVADO', 'PAGO', 'CONCLUIDO', 'CANCELADO')),

  -- Aparelho / Dispositivo
  aparelho         VARCHAR(255),   -- Ex: iPhone 13, Samsung A54, Notebook Dell
  marca_aparelho   VARCHAR(100),   -- Ex: Apple, Samsung, Dell
  modelo_aparelho  VARCHAR(100),   -- Ex: A2633, SM-A546B
  numero_serie     VARCHAR(100),   -- IMEI ou número de série
  cor_aparelho     VARCHAR(50),

  -- Acessórios entregues pelo cliente
  acessorios       TEXT,           -- Ex: Carregador, Capa, Película

  -- Descrição do problema / serviço
  descricao        TEXT,           -- Problema relatado pelo cliente
  diagnostico      TEXT,           -- Diagnóstico do técnico
  servico_realizado TEXT,          -- O que foi feito

  -- Valores
  desconto         NUMERIC(10,2) DEFAULT 0,
  valor_total      NUMERIC(10,2) DEFAULT 0,
  valor_final      NUMERIC(10,2) DEFAULT 0,

  -- Pagamento
  forma_pagamento  VARCHAR(20) DEFAULT 'PENDENTE'
                     CHECK (forma_pagamento IN ('DINHEIRO','CREDITO','DEBITO','PIX','PARCELADO','PENDENTE')),
  parcelas         INTEGER DEFAULT 1,
  data_pagamento   TIMESTAMP WITH TIME ZONE,

  -- Garantia
  garantia_meses   INTEGER DEFAULT 3,

  -- Datas
  data_criacao     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_conclusao   TIMESTAMP WITH TIME ZONE,
  data_entrega     TIMESTAMP WITH TIME ZONE,  -- Data de entrega ao cliente

  -- Leva e traz
  leva_traz        BOOLEAN DEFAULT false,      -- true = o técnico busca/entrega
  endereco_coleta  TEXT,                        -- Endereço de coleta (se diferente do cliente)

  observacoes      TEXT
);

-- ============================================================================
-- TABELA: itens_os (peças e serviços de cada OS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS itens_os (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id          UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  produto_id     UUID REFERENCES produtos(id),
  descricao      VARCHAR(255),      -- Descrição manual se não tiver produto cadastrado
  quantidade     INTEGER NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(10,2) NOT NULL,
  subtotal       NUMERIC(10,2) NOT NULL,
  tipo           VARCHAR(20) NOT NULL CHECK (tipo IN ('PRODUTO', 'SERVICO')),
  data_criacao   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES para melhorar a performance das buscas
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
CREATE INDEX IF NOT EXISTS idx_os_numero ON service_orders(numero_os);
CREATE INDEX IF NOT EXISTS idx_os_cliente ON service_orders(cliente_id);
CREATE INDEX IF NOT EXISTS idx_os_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_os_data ON service_orders(data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_itens_os ON itens_os(os_id);

-- ============================================================================
-- TRIGGER: atualizar data_atualizacao automaticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS úteis
-- ============================================================================

-- View: OS com nome do cliente
CREATE OR REPLACE VIEW v_service_orders AS
SELECT
  os.*,
  c.nome   AS cliente_nome,
  c.telefone AS cliente_telefone,
  c.email  AS cliente_email,
  c.endereco AS cliente_endereco,
  c.cidade AS cliente_cidade
FROM service_orders os
JOIN clientes c ON os.cliente_id = c.id;

-- View: Faturamento por mês
CREATE OR REPLACE VIEW v_faturamento_mes AS
SELECT
  DATE_TRUNC('month', data_criacao)::DATE AS mes,
  COUNT(*) AS total_os,
  COUNT(*) FILTER (WHERE status = 'PAGO') AS os_pagas,
  COALESCE(SUM(valor_final) FILTER (WHERE status = 'PAGO'), 0) AS total_faturado
FROM service_orders
GROUP BY DATE_TRUNC('month', data_criacao)
ORDER BY mes DESC;

-- ============================================================================
-- FIM DO SCHEMA
-- ============================================================================
