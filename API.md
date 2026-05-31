# 📋 JUNINHO.TECH - Documentação da API (Rotas em Português)

Esta é a documentação completa das rotas disponíveis no Backend Express do **Sistema de Ordem de Serviço (OS) - JUNINHO.TECH**.

Todas as rotas (exceto as de autenticação) exigem o cabeçalho de autorização:
`Authorization: Bearer <seu-token-jwt>`

---

## 🔐 1. Autenticação (`/api/auth`)

### POST `/register`
Cria um novo usuário (técnico) no sistema.
- **Payload:**
  ```json
  {
    "nome": "João Silva",
    "email": "joao@juninho.tech",
    "senha": "senha_segura_123"
  }
  ```
- **Resposta (201):**
  ```json
  {
    "message": "Usuário criado com sucesso",
    "usuario": {
      "id": "uuid-do-usuario",
      "email": "joao@juninho.tech",
      "nome": "João Silva",
      "ativo": true,
      "data_criacao": "2026-05-31T22:00:00.000Z"
    },
    "token": "token-jwt-gerado"
  }
  ```

### POST `/login`
Realiza a autenticação e gera o token de acesso.
- **Payload:**
  ```json
  {
    "email": "joao@juninho.tech",
    "senha": "senha_segura_123"
  }
  ```
- **Resposta (200):**
  ```json
  {
    "message": "Login realizado com sucesso",
    "usuario": {
      "id": "uuid-do-usuario",
      "email": "joao@juninho.tech",
      "nome": "João Silva",
      "ativo": true
    },
    "token": "token-jwt-gerado"
  }
  ```

### GET `/me`
Obtém os dados do usuário autenticado no momento.
- **Resposta (200):**
  ```json
  {
    "id": "uuid-do-usuario",
    "email": "joao@juninho.tech",
    "nome": "João Silva",
    "ativo": true,
    "data_criacao": "2026-05-31T22:00:00.000Z",
    "ultimo_login": "2026-05-31T22:05:00.000Z"
  }
  ```

---

## 👥 2. Clientes (`/api/clientes`)

### GET `/`
Lista todos os clientes ativos. Suporta busca por query string.
- **Query Params:** `?search=nome-ou-telefone`
- **Resposta (200):**
  ```json
  {
    "data": [
      {
        "id": "uuid-do-cliente",
        "nome": "Carlos Souza",
        "telefone": "11999999999",
        "email": "carlos@gmail.com",
        "cidade": "São Paulo",
        "estado": "SP",
        "ativo": true
      }
    ],
    "total": 1
  }
  ```

### POST `/`
Cria um novo cliente.
- **Payload:**
  ```json
  {
    "nome": "Carlos Souza",
    "telefone": "11999999999",
    "email": "carlos@gmail.com",
    "cidade": "São Paulo",
    "estado": "SP"
  }
  ```

---

## 🔩 3. Produtos / Peças (`/api/produtos`)

### GET `/`
Lista todos os produtos/peças ativos.
- **Query Params:** `?search=nome-da-peca`

### POST `/`
Cria um novo produto/peça.
- **Payload:**
  ```json
  {
    "nome": "Tela Frontal iPhone 13",
    "categoria": "Telas",
    "marca": "Apple",
    "preco_venda": 450.00,
    "estoque": 10,
    "estoque_minimo": 2
  }
  ```

---

## 📋 4. Ordens de Serviço (`/api/os`)

### GET `/`
Lista todas as ordens de serviço. Suporta filtros.
- **Query Params:** `?status=PENDENTE&tipo=ORCAMENTO`

### POST `/`
Cria uma nova ordem de serviço (inicialmente como orçamento).
- **Payload:**
  ```json
  {
    "cliente_id": "uuid-do-cliente",
    "tipo": "ORCAMENTO",
    "descricao": "iPhone 13 não liga",
    "garantia_meses": 3
  }
  ```

### POST `/:id/itens`
Adiciona um item (peça ou serviço) à OS.
- **Payload:**
  ```json
  {
    "produto_id": "uuid-do-produto",
    "descricao": "Troca de Tela Frontal",
    "quantidade": 1,
    "preco_unitario": 450.00,
    "tipo": "PRODUTO"
  }
  ```

### POST `/:id/converter-venda`
Converte um orçamento aprovado em venda fechada.
- **Payload:**
  ```json
  {
    "forma_pagamento": "PIX",
    "parcelas": 1
  }
  ```

---

## 📊 5. Relatórios (`/api/relatorios`)

### GET `/faturamento`
Obtém o faturamento consolidado por mês.

### GET `/os-resumo`
Obtém a quantidade total de OS divididas por status (pendente, paga, concluída).
