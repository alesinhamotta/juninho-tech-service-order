# 🔧 JUNINHO.TECH - Sistema de Service Order (OS)

**Sistema completo de gerenciamento de orçamentos, vendas, reparos e pagamentos para JUNINHO.TECH**

---

## 📋 Visão Geral

Sistema web para gerenciar:
- ✅ Orçamentos (Quote)
- ✅ Vendas (Sale)
- ✅ Reparos (Repair)
- ✅ Pagamentos
- ✅ Clientes
- ✅ Produtos e Acessórios
- ✅ Geração de PDF para WhatsApp
- ✅ Relatórios de faturamento

---

## 🛠️ Stack Tecnológico

**Frontend:**
- React 19
- TypeScript
- Tailwind CSS
- Shadcn/UI

**Backend:**
- Node.js + Express
- TypeScript
- Supabase (PostgreSQL)

**Autenticação:**
- Supabase Auth
- JWT

**Banco de Dados:**
- PostgreSQL (Supabase)

---

## 📁 Estrutura do Projeto

```
juninho-tech-service-order/
├── client/                    # Frontend React
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── NovaOS.tsx
│   │   │   ├── ListaOS.tsx
│   │   │   ├── DetalhesOS.tsx
│   │   │   └── Relatorios.tsx
│   │   ├── components/
│   │   │   ├── FormCliente.tsx
│   │   │   ├── FormProduto.tsx
│   │   │   ├── ChecklistCelular.tsx
│   │   │   ├── ChecklistComputador.tsx
│   │   │   ├── TabelaProdutos.tsx
│   │   │   └── GeradorPDF.tsx
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── App.tsx
│   ├── public/
│   └── package.json
│
├── server/                    # Backend Node.js
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── clientes.ts
│   │   ├── os.ts
│   │   ├── produtos.ts
│   │   └── relatorios.ts
│   ├── models/
│   │   ├── Cliente.ts
│   │   ├── OS.ts
│   │   ├── Produto.ts
│   │   └── Acessorio.ts
│   ├── middleware/
│   │   └── auth.ts
│   ├── utils/
│   │   ├── pdf.ts
│   │   └── validators.ts
│   └── index.ts
│
├── shared/                    # Código compartilhado
│   └── types.ts
│
├── database/                  # Scripts do banco
│   ├── schema.sql
│   ├── init.js
│   └── seed.js
│
├── docs/                      # Documentação
│   └── API.md
│
├── .env.example
├── .gitignore
├── tsconfig.json
├── tsconfig.server.json
└── package.json
```

---

## 🚀 Como Começar

### 1. **Clonar o Repositório**
```bash
git clone https://github.com/alesinhamotta/juninho-tech-service-order.git
cd juninho-tech-service-order
```

### 2. **Instalar Dependências**
```bash
npm install
cd client && npm install && cd ..
```

### 3. **Configurar Variáveis de Ambiente**
```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais Supabase:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. **Inicializar Banco de Dados**
```bash
npm run db:init
npm run db:seed
```

### 5. **Iniciar Desenvolvimento**
```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

---

## 📊 Estrutura de Dados

### **Clientes**
- ID (UUID)
- Nome
- Telefone (WhatsApp)
- Email
- Endereço
- Cidade
- Data de criação

### **Service Orders (OS)**
- ID (UUID)
- Número da OS (auto-gerado)
- Cliente (referência)
- Tipo (ORÇAMENTO / VENDA / REPARO)
- Status (PENDENTE / APROVADO / PAGO / CONCLUÍDO)
- Descrição
- Valor total
- Desconto
- Valor final
- Forma de pagamento
- Parcelas
- Garantia (meses)
- Data de criação/conclusão

### **Produtos**
- ID (UUID)
- Nome
- Categoria
- Marca
- Modelo
- Preço de custo
- Preço de venda
- Estoque
- Descrição

### **Acessórios**
- ID (UUID)
- Nome
- Categoria (PELÍCULA, CAPA, ENVELOPAMENTO, FONTE, etc)
- Preço
- Descrição

### **Itens da OS**
- ID (UUID)
- OS (referência)
- Produto (referência)
- Quantidade
- Preço unitário
- Subtotal
- Tipo (PRODUTO / SERVIÇO / ACESSÓRIO)

---

## 🔄 Fluxos Principais

### **1. Criar Orçamento**
1. Selecionar/criar cliente
2. Adicionar produtos
3. Definir preços
4. Aplicar desconto
5. Salvar como ORÇAMENTO
6. Gerar PDF e enviar via WhatsApp

### **2. Converter para Venda**
1. Abrir orçamento
2. Clicar "Converter para Venda"
3. Registrar pagamento
4. Confirmar

### **3. Gerenciar Reparo**
1. Criar OS de REPARO
2. Descrever problema
3. Marcar checklist
4. Adicionar acessórios
5. Marcar como CONCLUÍDO

---

## 📝 Checklists

### **Celular**
- Tela (touch, cores, pixels)
- Câmeras (frontal/traseira)
- Áudio (microfone/alto-falante)
- Bateria e carregamento
- Botões
- Conectividade (WiFi, Bluetooth, 4G)
- Sensores
- Limpeza
- Película/Capa (se solicitado)

### **Computador/Notebook**
- CPU, RAM, SSD/HD
- Placa mãe, fonte
- Ventoinhas e temperatura
- Teclado, touchpad
- Câmera, microfone, áudio
- Portas (USB, HDMI)
- Bateria (se notebook)
- Pasta térmica
- Drivers e antivírus
- Envelopamento/Fonte (se solicitado)

---

## 🔐 Autenticação

- Login com email/senha
- Sessão persistente
- Recuperação de senha
- Logout

---

## 📄 Geração de PDF

PDFs incluem:
- Dados do cliente
- Lista de produtos/serviços
- Valor total
- Formas de pagamento
- Termos de garantia
- Logo JUNINHO.TECH

---

## 📊 Relatórios

- Faturamento por período
- Produtos mais vendidos
- Clientes recorrentes
- Exportar para Excel/PDF

---

## 🚢 Deploy

### **Vercel (Frontend)**
```bash
npm run build:client
# Deploy client/ no Vercel
```

### **Railway/Render (Backend)**
```bash
npm run build:server
# Deploy no Railway/Render
```

---

## 📞 Suporte

Para dúvidas ou sugestões, entre em contato com Juninho Tech.

---

## 📄 Licença

MIT

---

**Desenvolvido com ❤️ para JUNINHO.TECH**
