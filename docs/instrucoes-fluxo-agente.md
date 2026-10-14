# Diretrizes de Encadeamento Relacional e Fluxo Operacional do Agente IA (Aranduê MEI)

Este documento estabelece as diretrizes canônicas, regras de encadeamento relacional e a árvore de decisão passo a passo que o **Agente de IA do Aranduê** deve seguir rigorosamente ao interagir com o Microempreendedor Individual (MEI).

---

## 🏛️ 1. Mapeamento Relacional do Sistema Aranduê

No Aranduê, nenhum registro de negócio deve viver de forma isolada no banco de dados. O sistema foi modelado para refletir a jornada real do MEI, desde o primeiro contato com o cliente até a emissão do documento fiscal e registro no Livro Caixa.

### 1.1 Diagrama de Relacionamento e Fluxo de Dados

```mermaid
flowchart TD
    subgraph Base ["1. Cadastros de Base"]
        C["Cliente (clientes)"]
        S["Serviço / Produto (servicos)"]
        I["Insumos / Estoque (estoque_insumos)"]
    end

    subgraph Proposta ["2. Proposta / Ordem de Serviço"]
        O["Orçamento / OS (orcamentos)"]
        OI["Itens do Orçamento (orcamento_itens)"]
    end

    subgraph Execucao ["3. Execução"]
        A["Agendamento / Atendimento (agendamentos)"]
    end

    subgraph Faturamento ["4. Financeiro & Fiscal"]
        COB["Cobrança (cobrancas)"]
        NF["Nota Fiscal - NFS-e / NF-e (notas_fiscais)"]
        CX["Livro Caixa (movimentacoes)"]
    end

    %% Relacionamentos
    S -.->|Ficha Técnica| I
    C -->|cliente_id| O
    S -->|servico_id| OI
    O -->|orcamento_id| OI

    O -->|"Status: APROVADO (orcamento_id)"| A
    C -->|cliente_id| A
    S -->|servico_id| A

    A -->|"Status: CONCLUIDO (agendamento_id)"| COB
    O -->|orcamento_id| COB
    C -->|cliente_id| COB

    COB -->|"Baixa: PAGO (cobranca_id)"| CX
    
    C -.->|cliente_id| NF
    O -.->|orcamento_id| NF
    S -.->|servico_id| NF
    NF -.->"gerar_caixa: true (movimentacao_id)"| CX
```

### 1.2 O Significado de "OS" (Ordem de Serviço) no Aranduê
No banco de dados e na arquitetura relacional do Aranduê:
- O registro de **Orçamento (`orcamentos`)** com seus itens (`orcamento_itens`) atua como a **Proposta Comercial / OS Preliminar**, onde estão discriminados os serviços, peças, quantidades, preços e condições comerciais.
- O registro de **Agendamento (`agendamentos`)** atua como a **Ordem de Execução / Atendimento da OS**, guardando data, hora, status de realização (`PENDENTE` $\rightarrow$ `CONFIRMADO` $\rightarrow$ `CONCLUIDO`) e observações técnicas.
- **Portanto:** Quando o usuário se referir a "criar uma OS", o agente deve entender a dupla **Orçamento + Agendamento**.

---

## 🧭 2. O Passo a Passo Padrão (Pipeline Canônico)

Toda operação comercial completa no sistema segue o ciclo em 6 etapas:

1. **Identificação do Cliente (`clientes`):** Localizar o cliente via `listar_clientes`. Se não existir e os dados foram fornecidos, cadastrar via `cadastrar_cliente`.
2. **Definição dos Serviços/Produtos (`servicos`):** Localizar o serviço via `listar_servicos`. Se for um serviço novo, cadastrar no catálogo via `cadastrar_servico`.
3. **Formalização da OS / Orçamento (`orcamentos`):** Criar o orçamento vinculado ao `cliente_id` e aos itens com `servico_id`. Ao fechar negócio, atualizar para `APROVADO` (dispara reserva/baixa de insumos se houver ficha técnica).
4. **Agendamento da Execução (`agendamentos`):** Criar o agendamento vinculado obrigatoriamente ao `orcamento_id` aprovado e ao `cliente_id`.
5. **Cobrança / Título a Receber (`cobrancas`):** Gerar a cobrança vinculada ao atendimento concluído (`agendamento_id`) ou orçamento (`orcamento_id`). Ao ser quitada (`PAGO`), liquida automaticamente no Livro Caixa (`movimentacoes`).
6. **Emissão de Nota Fiscal (`notas_fiscais`):** Emitir a NFS-e ou NF-e vinculando `cliente_id`, `orcamento_id` e itens de catálogo (`servico_id`), sincronizando o Livro Caixa.

---

## 🎯 3. Regras de Comportamento Mandatórias do Agente IA

Ao receber qualquer solicitação do usuário, o agente deve aplicar rigorosamente a seguinte árvore de decisão:

### Cenário 1: Solicitação de Emissão de Nota Fiscal ou Cobrança Isolada
Quando o usuário pedir diretamente para criar uma nota fiscal ou cobrança (ex: *"Emite uma nota pro Marcos de 350 reais"* ou *"Cria uma nota de serviço de pintura"*):

1. **Verificação de Dados:** Avalie se foram fornecidos todos os dados mínimos necessários para a emissão (tomador, documento CPF/CNPJ, descrição do serviço, valor).
2. **Pergunta Obrigatória de Encadeamento (se faltar contexto):**
   > Se o usuário **NÃO** informou se já existe uma OS/Orçamento ou serviço no catálogo, o agente **DEVE OBRIGATORIAMENTE PERGUNTAR** se ele deseja vincular ou criar esses registros primeiro:
   > 
   > *"Identifiquei o pedido de emissão da nota fiscal para [Cliente/Tomador]. Para manter todo o histórico do seu negócio organizado e integrado, você gostaria que eu também registrasse a **Ordem de Serviço / Orçamento** e cadastrasse o **serviço no catálogo**, ou prefere que eu emita apenas a nota avulsa?"*
3. **Execução Direta sem Perguntas (quando todos os dados já foram fornecidos):**
   > Se o usuário já tiver detalhado a operação de ponta a ponta na mesma mensagem (ex: *"Fechei uma consultoria com a empresa X, CNPJ tal, valor de R$ 1.500, criei tudo e emite a nota fiscal"*):
   > O agente **PODE E DEVE criar diretamente todos os registros encadeados** (Cliente $\rightarrow$ Serviço $\rightarrow$ Orçamento $\rightarrow$ Nota Fiscal) chamando as ferramentas em sequência sem interromper o usuário, e apresentar ao final um resumo claro de todos os itens cadastrados e linkados!

### Cenário 2: Consulta Prévia de Duplicidade (Reaproveitamento)
- Antes de invocar ferramentas de cadastro (`cadastrar_cliente` ou `cadastrar_servico`), o agente deve consultar a base (`listar_clientes`, `listar_servicos`) para checar se o registro já existe pelo nome.
- Se o registro existir, utilize o `id` existente para vinculação nas etapas seguintes.

### Cenário 3: Solicitação de Agendamento
- A regra de negócio do backend exige que todo agendamento esteja atrelado a um orçamento com status `APROVADO`.
- Se o usuário pedir para agendar um compromisso sem mencionar orçamento, o agente deve alertar gentilmente:
  > *"Para agendar esse atendimento mantendo o fluxo integrado, precisamos de um orçamento aprovado para o cliente. Posso gerar o orçamento dessa OS para você agora?"*

### Cenário 4: Proibição Estrita de Documentos Fictícios (CPF/CNPJ)
- **NUNCA invente ou preencha documentos fictícios:** É expressamente proibido alucinar `00000000000`, `11111111111` ou qualquer CPF/CNPJ arbitrário para contornar a obrigatoriedade da ferramenta.
- **Fluxo com Documento Faltante:**
  - Se o usuário solicitou uma emissão de nota mas não informou o CPF ou CNPJ do tomador, o agente **pode cadastrar o Cliente, o Serviço e a OS/Orçamento**, pois esses registros não exigem documento obrigatório.
  - No entanto, o agente **deve obrigatoriamente pausar antes da emissão da nota fiscal** e solicitar o documento real ao usuário:
    > *"Cadastrei o cliente [Nome], o serviço e a Ordem de Serviço aprovada no valor de R$ [Valor]. Para emitir a Nota Fiscal oficial perante a Receita Federal / SEFAZ, preciso do CPF ou CNPJ do tomador. Poderia me informar o documento?"*

### Cenário 5: Vendas e Lançamentos Internos NÃO Exigem CPF/CNPJ
- **Diferença entre Venda Operacional e Nota Fiscal:**
  - Quando o usuário pede para *"registrar uma venda"*, *"lançar um serviço"*, *"fechar com cliente"*, *"anotar aí"*, *"bota pra cobrar"* ou *"só pra guardar"*, trata-se de um **lançamento comercial e financeiro interno**.
  - O cadastro de cliente (`cadastrar_cliente`), o orçamento de venda (`cadastrar_orcamento`) e a cobrança (`cadastrar_cobranca`) **NÃO EXIGEM CPF OU CNPJ** (o cliente só requer o nome).
  - O agente **NUNCA DEVE EXIGIR CPF/CNPJ** para registrar vendas ou clientes. CPF/CNPJ só é aplicável se o MEI pedir expressamente para *"emitir nota fiscal"*.
- **Proibição de Confirmação Falsa ("Memória Fantasma"):**
  - O agente não tem armazenamento além do banco de dados relacional MySQL.
  - O agente **NUNCA pode responder *"Entendido! Guardei aqui a informação"*, *"Anotado"* ou *"Salvei"*** sem ter executado as ferramentas MCP (`cadastrar_cliente`, `cadastrar_orcamento`, `cadastrar_cobranca`). Quando o usuário diz *"só pra guardar"*, ele está instruindo o agente a salvar esses registros no sistema imediatamente!

---

## 🛠️ 4. Suporte Operacional MCP Implementado

Para garantir a execução 100% automatizada desse encadeamento via chamadas de ferramentas pelo LLM (Paridade Total REST ↔ MCP), foram disponibilizadas no `server.py`:

### 4.1 Ferramentas de Orçamento (OS)
- `cadastrar_orcamento`: Registra a proposta/OS com itens (`servico_id`, `quantidade`, `preco_unitario`), descontos e vínculo ao `cliente_id`.
- `listar_orcamentos`: Consulta o histórico de propostas e OSs por status ou cliente.
- `atualizar_status_orcamento`: Permite transitar para `'APROVADO'` (disparando reserva de estoque e liberando agendamento/cobrança) ou `'CANCELADO'`.

### 4.2 Parâmetros de Vínculo de Chaves Estrangeiras nas Ferramentas MCP
- **Módulo Fiscal (`emitir_nfse_nacional` e `emitir_nfe_produtos`):** Suportam `cliente_id` e `orcamento_id` opcionais, garantindo que as notas emitidas fiquem associadas à OS e ao cliente no banco de dados.
- **Agendamento (`cadastrar_agendamento`):** Suporta `orcamento_id`, atendendo à exigência relacional do backend para agendamentos de ordens aprovadas.
- **Cobrança (`cadastrar_cobranca`):** Suporta `orcamento_id` e `agendamento_id`, garantindo que o faturamento aponte para a OS de origem e dê baixa automática no Livro Caixa quando liquidado.

### 4.3 Definição Arquitetural sobre a Ordem de Serviço (OS)
- Confirmado que **não é necessária** uma tabela nova no banco de dados exclusivamente para OS.
- O ecossistema Aranduê adota com sucesso o binômio **`orcamentos` (proposta/escopo técnico e financeiro)** + **`agendamentos` (atendimento e execução)** como a representação completa da Ordem de Serviço do MEI.

