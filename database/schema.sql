-- ============================================================================
-- JUNINHO.TECH - Service Order System Database Schema
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CLIENTES (Customers)
-- ============================================================================
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(2),
  cep VARCHAR(10),
  data_criacao TIMESTAMP DEFAULT NOW(),
  data_atualizacao TIMESTAMP DEFAULT NOW(),
  ativo BOOLEAN DEFAULT TRUE,
  observacoes TEXT,
  UNIQUE(telefone)
);

CREATE INDEX idx_clientes_telefone ON clientes(telefone);
CREATE INDEX idx_clientes_nome ON clientes(nome);

-- ============================================================================
-- SERVICE ORDERS (OS - Orçamentos, Vendas, Reparos)
-- ============================================================================
CREATE TABLE service_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_os VARCHAR(50) UNIQUE NOT NULL,
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ORCAMENTO', 'VENDA', 'REPARO')),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'APROVADO', 'PAGO', 'CONCLUIDO', 'CANCELADO')),
  descricao TEXT,
  data_criacao TIMESTAMP DEFAULT NOW(),
  data_conclusao TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT NOW(),
  
  -- Valores
  valor_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  desconto DECIMAL(10, 2) DEFAULT 0,
  valor_final DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Pagamento
  forma_pagamento VARCHAR(50) CHECK (forma_pagamento IN ('DINHEIRO', 'CREDITO', 'DEBITO', 'PIX', 'PARCELADO', 'PENDENTE')),
  parcelas INT DEFAULT 1,
  valor_parcela DECIMAL(10, 2),
  data_pagamento TIMESTAMP,
  
  -- Garantia
  garantia_meses INT DEFAULT 12,
  
  -- Metadados
  observacoes TEXT,
  criado_por VARCHAR(100),
  
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

CREATE INDEX idx_os_numero ON service_orders(numero_os);
CREATE INDEX idx_os_cliente ON service_orders(cliente_id);
CREATE INDEX idx_os_tipo ON service_orders(tipo);
CREATE INDEX idx_os_status ON service_orders(status);
CREATE INDEX idx_os_data ON service_orders(data_criacao);

-- ============================================================================
-- PRODUTOS (Products)
-- ============================================================================
CREATE TABLE produtos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  marca VARCHAR(100),
  modelo VARCHAR(100),
  descricao TEXT,
  
  -- Preços
  preco_custo DECIMAL(10, 2),
  preco_venda DECIMAL(10, 2) NOT NULL,
  
  -- Estoque
  estoque INT DEFAULT 0,
  estoque_minimo INT DEFAULT 5,
  
  -- Metadados
  ativo BOOLEAN DEFAULT TRUE,
  data_criacao TIMESTAMP DEFAULT NOW(),
  data_atualizacao TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_produtos_categoria ON produtos(categoria);
CREATE INDEX idx_produtos_nome ON produtos(nome);
CREATE INDEX idx_produtos_ativo ON produtos(ativo);

-- ============================================================================
-- ACESSÓRIOS (Accessories for repairs)
-- ============================================================================
CREATE TABLE acessorios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  preco DECIMAL(10, 2) NOT NULL,
  descricao TEXT,
  estoque INT DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  data_criacao TIMESTAMP DEFAULT NOW(),
  data_atualizacao TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_acessorios_categoria ON acessorios(categoria);
CREATE INDEX idx_acessorios_nome ON acessorios(nome);

-- ============================================================================
-- ITENS DA OS (Items in Service Orders)
-- ============================================================================
CREATE TABLE itens_os (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  os_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos(id),
  acessorio_id UUID REFERENCES acessorios(id),
  
  descricao VARCHAR(255),
  quantidade INT NOT NULL DEFAULT 1,
  preco_unitario DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('PRODUTO', 'SERVICO', 'ACESSORIO')),
  
  data_criacao TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (os_id) REFERENCES service_orders(id)
);

CREATE INDEX idx_itens_os ON itens_os(os_id);
CREATE INDEX idx_itens_produto ON itens_os(produto_id);

-- ============================================================================
-- CHECKLISTS (Service checklists)
-- ============================================================================
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('CELULAR', 'COMPUTADOR', 'NOTEBOOK', 'TABLET', 'PC_GAMER')),
  item VARCHAR(255) NOT NULL,
  descricao TEXT,
  ordem INT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  
  UNIQUE(tipo, item)
);

CREATE INDEX idx_checklists_tipo ON checklists(tipo);

-- ============================================================================
-- CHECKLIST ITEMS (Items checked in a service order)
-- ============================================================================
CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  os_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  checklist_id UUID NOT NULL REFERENCES checklists(id),
  
  marcado BOOLEAN DEFAULT FALSE,
  observacao TEXT,
  data_criacao TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (os_id) REFERENCES service_orders(id),
  FOREIGN KEY (checklist_id) REFERENCES checklists(id)
);

CREATE INDEX idx_checklist_items_os ON checklist_items(os_id);

-- ============================================================================
-- PAGAMENTOS (Payment records)
-- ============================================================================
CREATE TABLE pagamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  os_id UUID NOT NULL REFERENCES service_orders(id),
  
  valor DECIMAL(10, 2) NOT NULL,
  forma_pagamento VARCHAR(50) NOT NULL,
  numero_parcela INT DEFAULT 1,
  total_parcelas INT DEFAULT 1,
  
  data_pagamento TIMESTAMP DEFAULT NOW(),
  data_vencimento TIMESTAMP,
  status VARCHAR(20) DEFAULT 'PAGO' CHECK (status IN ('PENDENTE', 'PAGO', 'CANCELADO')),
  
  observacoes TEXT,
  
  FOREIGN KEY (os_id) REFERENCES service_orders(id)
);

CREATE INDEX idx_pagamentos_os ON pagamentos(os_id);
CREATE INDEX idx_pagamentos_data ON pagamentos(data_pagamento);

-- ============================================================================
-- USUARIOS (Users - for authentication)
-- ============================================================================
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  
  ativo BOOLEAN DEFAULT TRUE,
  data_criacao TIMESTAMP DEFAULT NOW(),
  ultimo_login TIMESTAMP,
  
  UNIQUE(email)
);

-- ============================================================================
-- TRIGGERS (Auto-update data_atualizacao)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_clientes_update BEFORE UPDATE ON clientes
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_produtos_update BEFORE UPDATE ON produtos
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_acessorios_update BEFORE UPDATE ON acessorios
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_service_orders_update BEFORE UPDATE ON service_orders
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- VIEWS (Useful queries)
-- ============================================================================

-- View: OS com totais
CREATE VIEW v_service_orders_totais AS
SELECT 
  so.id,
  so.numero_os,
  so.tipo,
  so.status,
  c.nome as cliente_nome,
  c.telefone,
  so.valor_total,
  so.desconto,
  so.valor_final,
  so.forma_pagamento,
  so.parcelas,
  so.data_criacao,
  so.data_conclusao
FROM service_orders so
JOIN clientes c ON so.cliente_id = c.id;

-- View: Faturamento por mês
CREATE VIEW v_faturamento_mes AS
SELECT 
  DATE_TRUNC('month', so.data_criacao)::DATE as mes,
  COUNT(*) as total_os,
  SUM(so.valor_final) as total_faturado,
  COUNT(CASE WHEN so.status = 'PAGO' THEN 1 END) as os_pagas
FROM service_orders so
WHERE so.tipo IN ('VENDA', 'REPARO')
GROUP BY DATE_TRUNC('month', so.data_criacao)
ORDER BY mes DESC;

-- ============================================================================
-- ÍNDICES ADICIONAIS (Performance)
-- ============================================================================
CREATE INDEX idx_service_orders_cliente_tipo ON service_orders(cliente_id, tipo);
CREATE INDEX idx_service_orders_status_data ON service_orders(status, data_criacao);
CREATE INDEX idx_itens_os_tipo ON itens_os(tipo);
