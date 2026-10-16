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

### 9.1 Resumo Consolidado do Negócio (Legado)
- **Método:** `GET`
- **Rota:** `/api/dashboard/resumo` (ou alias `GET /api/dashboard`)
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

### 9.2 Listar Dashboards do MEI (com Auto-Provisionamento)
- **Método:** `GET`
- **Rota:** `/api/dashboards`
- **Descrição:** Retorna a lista de painéis do MEI com seus respectivos widgets. Caso o MEI não possua dashboards cadastrados, provisiona automaticamente o dashboard "Principal" com os 3 widgets essenciais (Termômetro MEI, Fluxo de Caixa e Despesas por Categoria).
- **Resposta Sucesso (`200 OK`):**
```json
{
  "sucesso": true,
  "mensagem": "Dashboards obtidos com sucesso",
  "dados": [
    {
      "id": 1,
      "nome": "Principal",
      "descricao": "Visão geral e indicadores principais do negócio",
      "eh_padrao": 1,
      "ordem": 0,
      "widgets": [
        {
          "id": 1,
          "titulo": "Termômetro do Teto MEI",
          "tipo_grafico": "radial_gauge",
          "metrica": "limite_mei",
          "periodo": "ano_atual",
          "largura": 2,
          "ordem": 0
        }
      ]
    }
  ]
}
```

### 9.3 Catálogo Seguro de Métricas Analíticas
- **Método:** `GET`
- **Rota:** `/api/dashboards/metricas/catalogo`
- **Resposta Sucesso (`200 OK`):**
```json
{
  "sucesso": true,
  "mensagem": "Catálogo de métricas analíticas obtido com sucesso",
  "dados": {
    "metricas": [
      { "chave": "limite_mei", "nome": "Faturamento vs Teto MEI", "graficos_compativeis": ["radial_gauge", "kpi"] },
      { "chave": "fluxo_caixa", "nome": "Fluxo de Caixa (Entradas vs Saídas)", "graficos_compativeis": ["bar", "area", "line"] },
      { "chave": "despesas_categoria", "nome": "Despesas por Categoria", "graficos_compativeis": ["donut", "pie", "bar"] },
      { "chave": "top_servicos", "nome": "Serviços e Produtos Mais Vendidos", "graficos_compativeis": ["bar", "pie", "donut"] },
      { "chave": "cobrancas_status", "nome": "Status das Cobranças", "graficos_compativeis": ["donut", "pie", "bar"] },
      { "chave": "funil_orcamentos", "nome": "Funil de Orçamentos", "graficos_compativeis": ["bar", "donut"] },
      { "chave": "novos_clientes", "nome": "Evolução de Novos Clientes", "graficos_compativeis": ["line", "bar", "area"] }
    ],
    "periodos": ["mes_atual", "ultimos_3_meses", "ultimos_6_meses", "ano_atual", "historico_total"]
  }
}
```

### 9.4 Obter Dashboard Detalhado com Dados Computados
- **Método:** `GET`
- **Rota:** `/api/dashboards/:id`
- **Descrição:** Retorna o dashboard com os dados computados de cada métrica em tempo real.

### 9.5 Criar Novo Dashboard
- **Método:** `POST`
- **Rota:** `/api/dashboards`
- **Payload:** `{ "nome": "Acompanhamento de Vendas", "descricao": "Metas e clientes" }`
- **Resposta Sucesso (`201 Created`)**

### 9.6 Adicionar Widget Gráfico ao Dashboard
- **Método:** `POST`
- **Rota:** `/api/dashboards/:id/widgets`
- **Payload:**
```json
{
  "titulo": "Evolução de Vendas",
  "tipo_grafico": "bar",
  "metrica": "fluxo_caixa",
  "periodo": "ultimos_6_meses",
  "largura": 1
}
```
- **Resposta Sucesso (`201 Created`)**

### 9.7 Atualizar e Excluir Widgets / Dashboards
- `PUT /api/dashboards/:id` — Atualiza título, descrição ou ordem do painel.
- `DELETE /api/dashboards/:id` — Exclui painel customizado (impede exclusão do único painel ativo).
- `PUT /api/dashboards/:id/widgets/:widgetId` — Atualiza título, métrica, tipo, período ou largura do widget.
- `DELETE /api/dashboards/:id/widgets/:widgetId` — Remove widget do painel.


---

## 10. Módulo do Assistente IA (`/api/assistente`)
*Todas as rotas requerem autenticação Bearer com token padrão de usuário.*
*Tokens restritos (`scope: 'assistente:read'`) são bloqueados nestas rotas.*

### 10.1 Listar Conversas do Usuário
- **Método:** `GET`
- **Rota:** `/api/assistente/conversas`
- **Resposta Sucesso (`200 OK`):**
```json
{
  "sucesso": true,
  "mensagem": "Conversas listadas com sucesso",
  "dados": [
    {
      "id": 1,
      "titulo": "Dúvida sobre DAS e boleto",
      "criado_em": "2026-10-07T14:00:00.000Z",
      "atualizado_em": "2026-10-07T14:05:00.000Z"
    }
  ]
}
```

### 10.2 Enviar Mensagem no Chat
- **Método:** `POST`
- **Rota:** `/api/assistente/mensagens`
- **Rate Limit:** Máximo de 20 mensagens a cada 10 minutos por usuário.
- **Payload:**
```json
{
  "conversa_id": 1,
  "mensagem": "Qual o limite de faturamento anual do MEI?",
  "assincrono": true
}
```
*Nota: Se `conversa_id` for omitido ou nulo, uma nova conversa é criada automaticamente com título baseado na mensagem.*
*Nota: Se `assincrono` for `true`, a rota responde imediatamente com status `202 Accepted`, permitindo que a IA processe a resposta em segundo plano enquanto o frontend executa short-polling.*

- **Resposta Sucesso Síncrona (`200 OK` - quando `assincrono: false` ou omitido):**
```json
{
  "sucesso": true,
  "mensagem": "Resposta do assistente processada com sucesso",
  "dados": {
    "conversa_id": 1,
    "mensagem": {
      "id": 42,
      "conversa_id": 1,
      "papel": "assistente",
      "status": "concluida",
      "conteudo": "O limite anual de faturamento do MEI é de R$ 81.000,00...",
      "fontes": [
        {
          "pagina": 4,
          "arquivo": "perguntaomei.pdf",
          "trecho": "limite de receita bruta previsto no § 1º do artigo 18-A..."
        }
      ],
      "criado_em": "2026-10-07T14:05:02.000Z"
    }
  }
}
```

- **Resposta Sucesso Assíncrona (`202 Accepted` - quando `assincrono: true`):**
```json
{
  "sucesso": true,
  "mensagem": "Mensagem em processamento",
  "dados": {
    "conversa_id": 1,
    "mensagem_usuario_id": 41,
    "mensagem": {
      "id": 42,
      "conversa_id": 1,
      "papel": "assistente",
      "status": "processando",
      "conteudo": null,
      "fontes": [],
      "criado_em": "2026-10-07T14:05:02.000Z"
    }
  }
}
```

### 10.3 Consultar Status de Mensagem (Short-Polling)
- **Método:** `GET`
- **Rota:** `/api/assistente/mensagens/:id/status`
- **Resposta Sucesso (`200 OK`):**
```json
{
  "sucesso": true,
  "mensagem": "Status da mensagem consultado com sucesso",
  "dados": {
    "id": 42,
    "conversa_id": 1,
    "papel": "assistente",
    "status": "concluida",
    "erro_mensagem": null,
    "conteudo": "O limite anual de faturamento do MEI é de R$ 81.000,00...",
    "fontes": [
      {
        "pagina": 4,
        "arquivo": "perguntaomei.pdf",
        "trecho": "limite de receita bruta previsto no § 1º do artigo 18-A..."
      }
    ],
    "tools_usadas": [],
    "criado_em": "2026-10-07T14:05:02.000Z"
  }
}
```

### 10.4 Listar Mensagens de uma Conversa
- **Método:** `GET`
- **Rota:** `/api/assistente/conversas/:id/mensagens`
- **Isolamento:** Retorna `404 Not Found` se a conversa pertencer a outro usuário.
- **Resposta Sucesso (`200 OK`):**
```json
{
  "sucesso": true,
  "mensagem": "Mensagens listadas com sucesso",
  "dados": [
    {
      "id": 41,
      "papel": "usuario",
      "conteudo": "Qual o limite de faturamento anual do MEI?",
      "fontes": [],
      "criado_em": "2026-10-07T14:05:00.000Z"
    },
    {
      "id": 42,
      "papel": "assistente",
      "conteudo": "O limite anual de faturamento do MEI é de R$ 81.000,00...",
      "fontes": [
        {
          "pagina": 4,
          "arquivo": "perguntaomei.pdf",
          "trecho": "limite de receita bruta..."
        }
      ],
      "criado_em": "2026-10-07T14:05:02.000Z"
    }
  ]
}
```

### 10.5 Excluir Conversa
- **Método:** `DELETE`
- **Rota:** `/api/assistente/conversas/:id`
- **Isolamento:** Retorna `404 Not Found` se a conversa pertencer a outro usuário.
- **Resposta Sucesso (`204 No Content`):** Vazio.

### 10.6 Consultar Status da Integração WhatsApp
- **Método:** `GET`
- **Rota:** `/api/assistente/whatsapp/status`
- **Descrição:** Retorna o status da conexão do Gateway WhatsApp Web (Baileys) no servidor e o número de WhatsApp vinculado à conta do MEI autenticado.
- **Resposta Sucesso (`200 OK`):**
```json
{
  "sucesso": true,
  "mensagem": "Status do WhatsApp obtido com sucesso",
  "dados": {
    "bot": {
      "status": "conectado",
      "conectado": true,
      "numero": "5511999990000",
      "qrCode": null
    },
    "usuario_whatsapp": "5511987654321",
    "usuario_whatsapp_verificado": true
  }
}
```

### 10.7 Vincular Número de WhatsApp do MEI
- **Método:** `POST`
- **Rota:** `/api/assistente/whatsapp/vincular`
- **Payload:** `{ "telefone": "(11) 98765-4321" }`
- **Validações:**
  - `400 Bad Request` caso o telefone não seja um celular brasileiro válido (DDD + 8 ou 9 dígitos).
  - `409 Conflict` caso o número já esteja vinculado a outra conta MEI.
- **Resposta Sucesso (`200 OK`):**
```json
{
  "sucesso": true,
  "mensagem": "Número de WhatsApp vinculado com sucesso ao assistente!",
  "dados": {
    "whatsapp": "5511987654321",
    "formatado": "+55 (11) 98765-4321",
    "whatsapp_verificado": true
  }
}
```

### 10.8 Reiniciar Sessão do Gateway WhatsApp (Gerar Novo QR Code)
- **Método:** `POST`
- **Rota:** `/api/assistente/whatsapp/resetar`
- **Descrição:** Encerra o socket ativo do Baileys, limpa as credenciais locais (`.wweb_auth_baileys`) e reinicia a conexão gerando um novo QR Code no terminal do servidor.
- **Resposta Sucesso (`200 OK`):**
```json
{
  "sucesso": true,
  "mensagem": "Sessão do WhatsApp reiniciada com sucesso. Um novo QR Code foi gerado no terminal do servidor.",
  "dados": {
    "status": "aguardando_qr",
    "conectado": false,
    "numero": null,
    "qrCode": "2@..."
  }
}
```

