# Especificação da API RESTful — MEI

Esta documentação detalha os padrões arquiteturais, cabeçalhos, autenticação, modelos de requisição/resposta e códigos de status HTTP para a API Node.js/Express do projeto **MEI — Gestão Simplificada**.

---

## 1. Padrões Gerais

- **Base URL:** `/api`
- **Formato dos Dados:** `application/json` (com charset UTF-8)
- **Autenticação:** Bearer Token via cabeçalho `Authorization: Bearer <JWT_TOKEN>`
- **Filtro Multi-Tenant:** Todas as rotas protegidas extraem o `usuario_id` a partir do token decodificado e filtram as consultas SQL estritamente por esse usuário.

### 1.1 Códigos de Status HTTP Padronizados
- `200 OK` — Requisição processada com sucesso (leitura ou atualização).
- `201 Created` — Novo recurso criado com sucesso.
- `204 No Content` — Exclusão processada com sucesso sem retorno de corpo.
- `400 Bad Request` — Parâmetros inválidos, campos obrigatórios ausentes ou violação de regras de validação.
- `401 Unauthorized` — Token ausente, expirado ou inválido.
- `403 Forbidden` — Tentativa de acessar ou alterar recurso pertencente a outro usuário.
- `404 Not Found` — Recurso solicitado não encontrado.
- `409 Conflict` — Conflito de dados (ex: e-mail já cadastrado, choque de horário na agenda).
- `500 Internal Server Error` — Erro inesperado do servidor.

### 1.2 Formato Padrão de Resposta de Erro
```json
{
  "sucesso": false,
  "mensagem": "Descrição legível do erro",
  "erros": [
    "Detalhe opcional de validação de campo"
  ]
}
```

---

## 2. Módulo de Autenticação (`/api/auth`)

### 2.1 Cadastrar Novo MEI
- **Método:** `POST`
- **Rota:** `/api/auth/register`
- **Acesso:** Público
- **Payload:**
```json
{
  "nome": "João Victor Silva",
  "email": "joao@exemplo.com",
  "senha": "SenhaForte123@"
}
```
- **Resposta Sucesso (`201 Created`):**
```json
{
  "sucesso": true,
  "mensagem": "Usuário cadastrado com sucesso",
  "dados": {
    "id": 1,
    "nome": "João Victor Silva",
    "email": "joao@exemplo.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2.2 Login do MEI
- **Método:** `POST`
- **Rota:** `/api/auth/login`
- **Acesso:** Público
- **Payload:**
```json
{
  "email": "joao@exemplo.com",
  "senha": "SenhaForte123@"
}
```
- **Resposta Sucesso (`200 OK`):**
```json
{
  "sucesso": true,
  "mensagem": "Autenticado com sucesso",
  "dados": {
    "usuario": {
      "id": 1,
      "nome": "João Victor Silva",
      "email": "joao@exemplo.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2.3 Obter Dados do Usuário Autenticado
- **Método:** `GET`
- **Rota:** `/api/auth/me`
- **Acesso:** Privado (Bearer Token)
- **Resposta Sucesso (`200 OK`):**
```json
{
  "sucesso": true,
  "dados": {
    "id": 1,
    "nome": "João Victor Silva",
    "email": "joao@exemplo.com"
  }
}
```

---

## 3. Módulo de Clientes (`/api/clientes`)
*Todas as rotas requerem autenticação.*

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/clientes` | Listar todos os clientes do MEI (com suporte a busca por `?busca=nome`) |
| `POST` | `/api/clientes` | Cadastrar novo cliente |
| `GET` | `/api/clientes/:id` | Obter detalhes de um cliente específico |
| `PUT` | `/api/clientes/:id` | Atualizar dados cadastrais de um cliente |
| `DELETE`| `/api/clientes/:id` | Excluir ou inativar cliente |

### Exemplo de Payload — Criar/Atualizar Cliente
```json
{
  "nome": "Maria de Oliveira",
  "telefone": "(11) 98765-4321",
  "email": "maria@cliente.com",
  "endereco": "Rua das Flores, 123 - São Paulo/SP",
  "observacoes": "Prefere atendimentos no período da manhã"
}
```

---

## 4. Módulo de Serviços e Produtos (`/api/servicos`)
*Todas as rotas requerem autenticação.*

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/servicos` | Listar catálogo de itens cadastrados |
| `POST` | `/api/servicos` | Cadastrar novo serviço ou produto |
| `GET` | `/api/servicos/:id` | Obter detalhes do item |
| `PUT` | `/api/servicos/:id` | Atualizar item |
| `DELETE`| `/api/servicos/:id` | Desativar/excluir item |

### Exemplo de Payload — Criar/Atualizar Serviço
```json
{
  "nome": "Instalação Elétrica Residencial",
  "descricao": "Instalação completa de disjuntores e fiação básica",
  "preco": 250.00,
  "categoria": "Serviço"
}
```

---

## 5. Módulo de Agendamentos (`/api/agendamentos`)
*Todas as rotas requerem autenticação.*

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/agendamentos` | Listar agendamentos (filtros: `?data=YYYY-MM-DD` ou `?status=PENDENTE`) |
| `POST` | `/api/agendamentos` | Criar agendamento (com validação anti-choque de horário) |
| `GET` | `/api/agendamentos/:id` | Obter detalhes do agendamento com dados do cliente e serviço |
| `PUT` | `/api/agendamentos/:id` | Atualizar data/hora, status ou observações |
| `DELETE`| `/api/agendamentos/:id` | Cancelar ou excluir agendamento |

### Exemplo de Payload — Criar Agendamento
```json
{
  "cliente_id": 4,
  "servico_id": 2,
  "data_hora": "2026-10-15T14:30:00",
  "observacoes": "Levar escada e fita isolante"
}
```

---

## 6. Módulo de Orçamentos (`/api/orcamentos`)
*Todas as rotas requerem autenticação.*

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/orcamentos` | Listar orçamentos emitidos pelo MEI |
| `POST` | `/api/orcamentos` | Criar orçamento com múltiplos itens (backend calcula subtotal e total) |
| `GET` | `/api/orcamentos/:id` | Obter orçamento completo com relação de itens e cliente |
| `PUT` | `/api/orcamentos/:id` | Atualizar proposta e itens |
| `PATCH`| `/api/orcamentos/:id/status` | Alterar status (`APROVADO`, `RECUSADO`, `ENVIADO`) |
| `DELETE`| `/api/orcamentos/:id` | Excluir rascunho de orçamento |

### Exemplo de Payload — Criar Orçamento
```json
{
  "cliente_id": 4,
  "data_emissao": "2026-10-02",
  "validade": "2026-10-16",
  "desconto": 20.00,
  "observacoes": "Condição de pagamento: 50% no início e 50% na conclusão",
  "itens": [
    {
      "servico_id": 2,
      "quantidade": 1,
      "preco_unitario": 250.00
    },
    {
      "servico_id": 3,
      "quantidade": 2,
      "preco_unitario": 40.00
    }
  ]
}
```
*Regra:* O backend calcula `subtotal = (1*250) + (2*40) = 330.00` e `total = 330.00 - 20.00 = 310.00`.

---

## 7. Módulo de Cobranças (`/api/cobrancas`)
*Todas as rotas requerem autenticação.*

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/cobrancas` | Listar cobranças com filtros por status (`PENDENTE`, `PAGO`, `ATRASADO`) |
| `POST` | `/api/cobrancas` | Registrar nova cobrança para cliente (avulsa ou via orçamento) |
| `GET` | `/api/cobrancas/:id` | Obter detalhes da cobrança |
| `PUT` | `/api/cobrancas/:id` | Editar valor, vencimento ou observações |
| `PATCH`| `/api/cobrancas/:id/pagar` | **Baixa de Pagamento:** Marca como `PAGO` e cria entrada no caixa |
| `DELETE`| `/api/cobrancas/:id` | Cancelar ou remover cobrança |

### Exemplo de Payload — Criar Cobrança
```json
{
  "cliente_id": 4,
  "orcamento_id": 1,
  "valor": 310.00,
  "vencimento": "2026-10-20",
  "observacoes": "Chave Pix enviada para a cliente"
}
```

### Exemplo de Requisição — Dar Baixa em Pagamento (`PATCH /api/cobrancas/:id/pagar`)
```json
{
  "data_pagamento": "2026-10-18",
  "gerar_movimentacao_caixa": true,
  "categoria": "Recebimento de Serviço"
}
```

---

## 8. Módulo de Movimentações — Livro Caixa (`/api/movimentacoes`)
*Todas as rotas requerem autenticação.*

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/movimentacoes` | Listar entradas e saídas (filtros: `?periodo=YYYY-MM`, `?tipo=ENTRADA`) |
| `POST` | `/api/movimentacoes` | Lançamento manual no caixa (despesa ou receita avulsa) |
| `GET` | `/api/movimentacoes/:id` | Detalhes de um lançamento |
| `PUT` | `/api/movimentacoes/:id` | Atualizar lançamento |
| `DELETE`| `/api/movimentacoes/:id` | Excluir lançamento |

### Exemplo de Payload — Lançamento no Caixa
```json
{
  "tipo": "SAIDA",
  "categoria": "Material de Trabalho",
  "valor": 75.50,
  "data_movimentacao": "2026-10-02",
  "descricao": "Compra de rolo de fita isolante e conectores"
}
```

---

## 9. Módulo de Dashboard (`/api/dashboard`)
*Todas as rotas requerem autenticação.*

### 9.1 Resumo Consolidado do Negócio
- **Método:** `GET`
- **Rota:** `/api/dashboard/resumo`
- **Resposta Sucesso (`200 OK`):**
```json
{
  "sucesso": true,
  "dados": {
    "financeiro": {
      "entradas_mes": 3250.00,
      "saidas_mes": 840.00,
      "saldo_mes": 2410.00,
      "a_receber_pendente": 1150.00
    },
    "operacional": {
      "agendamentos_hoje": 3,
      "proximos_agendamentos": [
        {
          "id": 12,
          "cliente_nome": "Maria de Oliveira",
          "servico_nome": "Instalação Elétrica Residencial",
          "data_hora": "2026-10-02T14:30:00",
          "status": "CONFIRMADO"
        }
      ],
      "orcamentos_pendentes": 2,
      "total_clientes_ativos": 28
    }
  }
}
```
