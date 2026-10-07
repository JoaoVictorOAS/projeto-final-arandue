# Regras de Negócio e Políticas do Sistema

Este documento descreve as regras de negócio, restrições operacionais e validações lógicas que regem o comportamento da aplicação **MEI — Gestão Simplificada**.

---

## 1. Princípio de Isolamento Multi-Tenancy (Multi-MEI)

1. **Propriedade dos Registros:**  
   Todo cliente, serviço, agendamento, orçamento, cobrança ou movimentação financeira pertence estritamente a um único usuário (`usuario_id`).
2. **Barreira de Segurança:**  
   - O `usuario_id` **nunca** deve ser aceito cegamente a partir do corpo da requisição enviada pelo cliente.
   - O `usuario_id` é extraído do token JWT verificado pelo middleware de autenticação.
   - Qualquer operação de leitura, alteração ou exclusão deve conter a cláusula `WHERE usuario_id = ?` (ou validar se a entidade pai pertence ao usuário autenticado).
   - Tentativa de acesso cruzado resulta em `403 Forbidden` ou `404 Not Found`.

---

## 2. Gestão de Clientes e Catálogo de Serviços

1. **Identificação e Contato:**
   - O cadastro de um cliente exige ao menos o campo `nome`. Telefone e e-mail são fortemente recomendados para permitir emissão de orçamentos e lembretes.
   - O catálogo de serviços/produtos exige `nome` e `preco` (não negativo).
2. **Política de Exclusão vs Inativação:**
   - **Exclusão Lógica (Recomendada):** Clientes e serviços possuem a flag `ativo = 1`. Caso o usuário opte por "excluir" um cliente que já possui orçamentos, agendamentos ou cobranças associadas, o sistema inativa o registro (`ativo = 0`), preservando a integridade histórica.
   - **Exclusão Física:** Só é permitida se o registro não possuir nenhum histórico relacional no banco de dados.

---

## 3. Elaboração e Validação de Orçamentos

1. **Composição Obrigatória:**
   - Um orçamento só pode ser salvo se possuir pelo menos 1 (um) item válido.
2. **Cálculo Auditado no Backend:**
   - O frontend pode exibir o cálculo em tempo real para feedback do usuário, mas o **backend recalcula e valida** os valores antes de persistir no banco.
   - Fórmulas aplicadas:
     $$\text{subtotal\_item} = \text{quantidade} \times \text{preco\_unitario}$$
     $$\text{subtotal\_orcamento} = \sum \text{subtotal\_item}$$
     $$\text{total\_orcamento} = \text{subtotal\_orcamento} - \text{desconto}$$
   - O `desconto` não pode ser negativo nem superior ao `subtotal_orcamento` (o total mínimo é `0.00`).
3. **Ciclo de Vida do Status:**
   - `RASCUNHO`: Proposta em edição pelo MEI.
   - `ENVIADO`: Proposta compartilhada com o cliente.
   - `APROVADO`: Proposta aceita pelo cliente, habilitando a geração de cobrança ou agendamento.
   - `RECUSADO`: Proposta não aceita pelo cliente.

---

## 4. Agendamento e Conflitos de Agenda

1. **Datas e Horários:**
   - O agendamento exige data e hora futuras no momento da criação inicial.
   - É obrigatório vincular um cliente ativo.
2. **Prevenção de Choque de Horários:**
   - Um mesmo MEI não pode ter dois agendamentos ativos (`PENDENTE` ou `CONFIRMADO`) colidindo no mesmo horário.
   - Ao criar ou reagendar um compromisso, o sistema valida se já existe agendamento ativo com diferença inferior ao tempo mínimo padrão de atendimento (ex: 30 a 60 minutos de intervalo).
3. **Estados do Agendamento:**
   - `PENDENTE` $\rightarrow$ `CONFIRMADO` $\rightarrow$ `CONCLUIDO` (ou `CANCELADO`).

---

## 5. Cobranças e Integração Automática com o Livro Caixa

1. **Geração de Cobrança:**
   - A cobrança pode nascer a partir de um orçamento aprovado (`orcamento_id`) ou ser emitida avulsa para um cliente.
   - O valor deve ser estritamente maior que zero (`valor > 0`).
   - A data de vencimento deve ser informada.
2. **Status da Cobrança:**
   - `PENDENTE`: Aguardando recebimento.
   - `ATRASADO`: Vencimento expirado sem registro de pagamento.
   - `PAGO`: Valor recebido integralmente.
   - `CANCELADO`: Cobrança anulada.
3. **Automação do Livro Caixa na Baixa:**
   - Quando uma cobrança tem seu status alterado para `PAGO` (via endpoint de baixa):
     1. Atualiza `status = 'PAGO'` e registra `data_pagamento`.
     2. Se a opção `gerar_movimentacao_caixa` for verdadeira (padrão): o backend insere automaticamente um registro na tabela `movimentacoes`:
        - `tipo = 'ENTRADA'`
        - `categoria = 'Recebimento de Cliente'`
        - `valor = cobranca.valor`
        - `data_movimentacao = data_pagamento`
        - `cobranca_id = cobranca.id`
        - `descricao = 'Recebimento de cobrança #ID - Cliente: <Nome do Cliente>'`
   - Essa integração garante que o MEI não precise lançar manualmente duas vezes a mesma informação financeira.

---

## 6. Movimentações do Livro Caixa

1. **Tipos Válidos:**
   - `ENTRADA`: Aumento no saldo do caixa (vendas, recebimentos, aportes).
   - `SAIDA`: Despesas operacionais (compra de insumos, transporte, ferramentas, contas de consumo).
2. **Campos Obrigatórios:**
   - `tipo` (`ENTRADA` ou `SAIDA`), `valor` ($> 0$), `data_movimentacao`, `descricao` e `categoria`.
3. **Cálculo de Saldo do Período:**
   $$\text{Saldo} = \sum (\text{Entradas}) - \sum (\text{Saídas})$$

---

## 7. Indicadores do Dashboard

Os dados exibidos na tela inicial são calculados em tempo real ou agregados pelo backend:
1. **Faturamento do Mês:** Soma das entradas no caixa dentro do mês corrente.
2. **Despesas do Mês:** Soma das saídas no caixa dentro do mês corrente.
3. **Saldo Atual:** Diferença entre entradas e saídas do mês.
4. **Valores a Receber (Pendências):** Soma de todas as cobranças com status `PENDENTE` ou `ATRASADO`.
5. **Agenda de Hoje:** Quantidade e lista dos agendamentos marcados para a data atual.
6. **Orçamentos em Aberto:** Total de orçamentos com status `RASCUNHO` ou `ENVIADO`.

---

## 8. Assistente Virtual com Inteligência Artificial e MCP Multi-Tenancy

1. **Escopo e Limites de Acesso (Scoped Tokens):**
   - Ao encaminhar uma mensagem para o microserviço de IA, o backend Node.js emite um JWT efêmero (validade máxima de 15 minutos) assinado com o `tenant_id` e contendo o claim estrito `scope: 'assistente:read'`.
   - Este token **só permite operações de leitura (GET)** e é expressamente bloqueado em rotas de mutação (`POST`, `PUT`, `DELETE`) e nos endpoints do próprio chat (`/api/assistente/*`).
   - Tentativa de mutação com o token do assistente resulta em `403 Forbidden`.

2. **Isolamento de Processos MCP (Model Context Protocol):**
   - Cada tenant opera em um subprocesso Python dedicado gerenciado pelo pool (`TenantMcpPool`).
   - O processo do MCP herda exclusivamente a variável de ambiente `TENANT_TOKEN`. Nenhuma tool expõe ou aceita parâmetros como `tenant_id`, `usuario_id` ou `cnpj`, eliminando qualquer vulnerabilidade de IDOR ou injeção de parâmetros por parte do LLM.
   - O pool impõe desalocação automática por inatividade (LRU / TTL de 600 segundos).

3. **Privacidade e Conformidade com LGPD:**
   - As tools expostas pelo MCP (`obter_resumo_financeiro_ano`, `listar_cobrancas_status`, `consultar_limite_mei_atual`, etc.) omitem dados pessoais de clientes (telefones, endereços e e-mails).
   - O prompt de sistema do LLM proíbe expressamente alucinações e orienta o modelo a citar a página exata do manual oficial do MEI sempre que utilizar trechos do RAG.

4. **Taxa de Uso e Rate Limiting:**
   - O endpoint `/api/assistente/mensagens` limita as requisições a **20 mensagens por usuário a cada 10 minutos**. Requisições excedentes recebem `429 Too Many Requests`.
   - O tamanho máximo de cada mensagem enviada pelo usuário é de **2000 caracteres**.

5. **Aviso Legal Obrigatório:**
   - Toda resposta gerada pela interface do assistente deve conter o disclaimer: *"Orientação informativa baseada no documento oficial do MEI. Não substitui assessoria contábil."*
