# Design Spec: Agente Pessoal de Atendimento ao Cliente do MEI (B2B2C) — Limites de Agendamento, Transbordo Humano e Notificação Mobile

**Data:** 2026-10-18  
**Tópico:** Agente Pessoal de Atendimento ao Cliente (Ajuste de Tom, Capacidades MCP Limitadas, Alçada de Orçamento em R$, Limites de Antecedência de Agendamento, Transbordo para Humano com Notificação Mobile "Atendimento pendente" e Alta Performance no Railway)

---

## 1. Intenção e Motivação (The Why)

Microempreendedores Individuais (MEIs) perdem vendas e tempo respondendo repetidamente perguntas sobre preços, horários disponíveis e orçamentos simples enquanto estão executando seu trabalho.
A proposta cria um **Agente Pessoal de Atendimento ao Cliente** para cada MEI — configurável tanto pela interface quanto conversando com o **Assistente Copiloto atual do MEI** (que passa a atuar como "gerente" do atendente, definindo limites operacionais, financeiros, de agenda e de retorno ao humano).

---

## 2. Objetivos, Não-Objetivos e Anti-Objetivos

### Objetivos (Goals)
1. **Personalidade e Ajuste de Tom:** O MEI define o nome do atendente, mensagem de boas-vindas, instruções extras e o tom de voz (`FORMAL`, `AMIGAVEL`, `DESCONTRAIDO`, `CONSULTIVO`, `DIRETO`).
2. **Capacidades MCP Restritas (Allowlist):** O atendente opera exclusivamente sobre um subconjunto seguro de ferramentas MCP autorizadas pelo MEI (`permite_consultar_catalogo`, `permite_agendar`, `permite_gerar_orcamento`, `permite_fechar_orcamento`, `permite_gerar_cobranca_pix`).
3. **Alçada de Fechamento de Orçamento em R$ (Guardrails Determinísticos):** O MEI define de quanto a quanto (`orcamento_min_valor` a `orcamento_max_valor`, em R$) e qual o desconto máximo (`desconto_max_percentual`) o atendente pode aprovar e fechar diretamente com o cliente.
4. **Limites de Agendamento (Antecedência e Expediente):**
   - O MEI define a **antecedência mínima em dias** (`antecedencia_minima_dias`, ex: 1 dia ou 3 dias de antecedência) e a **antecedência máxima em dias** (`antecedencia_maxima_dias`, ex: 60 dias), além do horário de expediente (`horario_inicio` e `horario_fim`).
   - O backend valida deterministicamente se a data solicitada respeita a antecedência mínima/máxima e se o horário está livre e dentro do expediente.
5. **Retorno ao Humano (Transbordo / Handoff) & Notificação Mobile ("Atendimento pendente"):**
   - Qualquer solicitação que fuja da capacidade ou dos limites do agente (tentativa de agendar fora da antecedência mínima ou fora dos horários disponíveis, orçamento acima do teto, dúvida complexa ou pedido para falar com humano) gera automaticamente ou via tool (`atendente_solicitar_humano`) um registro de **Atendimento Pendente**.
   - O MEI pode configurar quando retornar ao humano (`transbordo_automatico`, `condicoes_retorno_humano`).
   - O aplicativo Web/Mobile exibe uma **notificação de "Atendimento pendente"** (alerta flutuante + badge no menu + suporte a Notification API no mobile) e uma fila onde o MEI visualiza o motivo, o resumo da conversa e pode assumir o atendimento ou concluir.
6. **Hierarquia Assistente -> Atendente:** O Assistente de IA do MEI possui ferramentas MCP (`obter_configuracoes_atendente`, `configurar_atendente_cliente`, `listar_atendimentos_pendentes`, `resolver_atendimento_pendente`) para ler e alterar todas as regras, limites de agendamento e fila de transbordo via linguagem natural.
7. **Eficiência Extrema para Railway:** Reutilização de pool HTTP/2 persistente (`httpx.AsyncClient` singleton) e filtragem determinística de tools por escopo.

### Não-Objetivos (Non-Goals)
- O Atendente do Cliente **não** responde dúvidas de legislação tributária/DAS do MEI (não aciona o RAG do `perguntaomei.pdf` para clientes finais, economizando latência e tokens).

### Anti-Objetivos
- **Vazamento Multi-Tenant ou Interno:** O Atendente do Cliente **jamais** pode acessar livro caixa, movimentações financeiras do MEI, notas fiscais ou listagem de outros clientes (`403 Forbidden` em `/api/atendente/pendencias` e `/api/atendente/config` para `scope === 'atendente:customer'`).
- **Agendamento Fora da Antecedência ou Horário:** O servidor Express nunca confirma um agendamento que viole `antecedencia_minima_dias` ou o expediente; em vez disso, bloqueia o agendamento automático e abre um `"Atendimento pendente"` para o humano.

---

## 3. Restrições Arquiteturais Globais

1. **Paridade Total REST ↔ MCP (`GEMINI.md`):** Tudo o que é configurável ou executável via REST (`/api/atendente/...`) possui paridade no MCP Server (`ai-service/mcp_server/server.py`).
2. **Isolamento por `usuario_id` e `scope`:**
   - Token do Assistente do MEI: `scope: 'assistente:operator'`
   - Token do Atendente do Cliente: `scope: 'atendente:customer'`
3. **Nenhuma assinatura MCP aceita `usuario_id` ou `tenant_id` como parâmetro do LLM.**
