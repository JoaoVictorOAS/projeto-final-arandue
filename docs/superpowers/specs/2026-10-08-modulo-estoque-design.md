# Especificação Técnica — Módulo de Estoque, Ficha Técnica e Simulação Produtiva

- **Data:** 2026-10-08
- **Status:** Aprovado para Implementação
- **Escopo:** Módulo de Estoque para Microempreendedores (Alimentação, Produção Artesanal e Salgados)
- **Autor/Arquitetura:** Pair Programming (Antigravity & Desenvolvedor)

---

## 1. Visão Geral e Objetivos

O presente documento especifica o novo **Módulo de Estoque e Produção** para a plataforma Arandue (MEI). Voltado especialmente para microempreendedores que transformam matérias-primas em produtos acabados (ex.: produtores de salgados, confeitarias, marmitarias e pequenos artesãos), o módulo soluciona o controle de ingredientes, precificação real por custo e rastreabilidade operacional.

### Objetivos Principais
1. **Controle de Insumos e Unidades Reais:** Gestão de matérias-primas em grandezas canônicas (`g`, `ml`, `un`) com conversão transparente de compras feitas em atacado (`kg`, `L`, fardos).
2. **Ficha Técnica / Receita (BOM):** Vinculação dos produtos do cardápio (`servicos`) aos ingredientes e embalagens necessários para sua confecção.
3. **Cálculo de CMV (Custo de Mercadoria Vendida) e Margem:** Determinação exata do custo unitário do produto a partir do Custo Médio Ponderado (CMP) dos insumos.
4. **Interligação Modular Nativa:**
   - **Vendas/Orçamentos (`orcamentos`):** Baixa automática sob encomenda ou por produto de pronta entrega.
   - **Livro Caixa (`movimentacoes`):** Geração opcional e rastreada de despesa financeira na compra de matéria-prima.
5. **Simulação Produtiva Conversacional:** Capacidade de calcular rendimento máximo, identificar o ingrediente limitante (gargalo) e sobras (ex.: *"Com tanto de X e tanto de Y, quanto consigo produzir de Z?"*).
6. **Paridade Arquitetural Total (API ↔ MCP):** Toda capacidade da API REST possui ferramenta correspondente no servidor MCP (`ai-service/mcp_server`), permitindo operação via Web e via Assistente de IA.
7. **Isolamento de Branches:** Preservação estrita da camada de orquestração de LLMs e seleção de modelos (`ai-service/app/llm/`), evitando conflitos com branches paralelas do desenvolvedor.

---

## 2. Modelo de Dados Relacional (MySQL)

As novas tabelas são totalmente isoladas e multi-tenant (chave estrangeira `usuario_id`), com extensão retrocompatível na tabela `servicos`.

### 2.1 Tabela `insumos`
```sql
CREATE TABLE IF NOT EXISTS insumos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nome VARCHAR(150) NOT NULL,
    unidade_base ENUM('g', 'ml', 'un') NOT NULL,
    quantidade_atual DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    estoque_minimo DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    custo_unitario DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deletado_em DATETIME NULL,
    CONSTRAINT fk_insumos_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_insumos_usuario (usuario_id),
    INDEX idx_insumos_ativo (usuario_id, ativo)
) ENGINE=InnoDB;
```

### 2.2 Tabela `fichas_tecnicas`
```sql
CREATE TABLE IF NOT EXISTS fichas_tecnicas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    servico_id INT NOT NULL,
    insumo_id INT NOT NULL,
    quantidade_necessaria DECIMAL(12, 3) NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ft_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ft_servico FOREIGN KEY (servico_id) 
        REFERENCES servicos(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ft_insumo FOREIGN KEY (insumo_id) 
        REFERENCES insumos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uk_ft_servico_insumo UNIQUE (servico_id, insumo_id),
    INDEX idx_ft_servico (servico_id),
    INDEX idx_ft_insumo (insumo_id)
) ENGINE=InnoDB;
```

### 2.3 Tabela `estoque_movimentacoes`
```sql
CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    insumo_id INT NULL,
    servico_id INT NULL,
    tipo ENUM(
        'ENTRADA_COMPRA', 
        'SAIDA_PRODUCAO', 
        'ENTRADA_PRODUCAO', 
        'SAIDA_VENDA', 
        'AJUSTE_PERDA', 
        'AJUSTE_INVENTARIO'
    ) NOT NULL,
    quantidade DECIMAL(12, 3) NOT NULL,
    custo_total DECIMAL(10, 2) NULL,
    movimentacao_financeira_id INT NULL,
    orcamento_id INT NULL,
    motivo VARCHAR(255) NULL,
    data_movimentacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_em_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_em_insumo FOREIGN KEY (insumo_id) 
        REFERENCES insumos(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_em_servico FOREIGN KEY (servico_id) 
        REFERENCES servicos(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_em_mov_fin FOREIGN KEY (movimentacao_financeira_id) 
        REFERENCES movimentacoes(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_em_orcamento FOREIGN KEY (orcamento_id) 
        REFERENCES orcamentos(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_em_usuario_data (usuario_id, data_movimentacao),
    INDEX idx_em_insumo (insumo_id),
    INDEX idx_em_servico (servico_id)
) ENGINE=InnoDB;
```

### 2.4 Extensão na Tabela `servicos`
Campos opcionais adicionados via migration para controle de produtos prontos (congelados/pronta-entrega):
```sql
ALTER TABLE servicos
ADD COLUMN controla_estoque_pronto TINYINT(1) NOT NULL DEFAULT 0,
ADD COLUMN estoque_pronto_atual INT NOT NULL DEFAULT 0,
ADD COLUMN estoque_pronto_minimo INT NOT NULL DEFAULT 0;
```

---

## 3. Lógica de Conversão, Custo Médio e CMV

### 3.1 Normalização de Unidades
Um helper utilitário centraliza a conversão para a unidade base canônica do insumo:
* **Massa (`g`):** 
  * `kg` $\to$ valor $\times 1.000$
  * `g` $\to$ valor $\times 1$
* **Volume (`ml`):**
  * `L` ou `litros` $\to$ valor $\times 1.000$
  * `ml` $\to$ valor $\times 1$
* **Unidade (`un`):**
  * `un` $\to$ valor $\times 1$
  * `pct` ou `cx` $\to$ valor $\times$ unidades_por_embalagem

### 3.2 Custo Médio Ponderado (CMP)
Ao registrar nova compra de insumo:
$$\text{Novo Custo Unitário Base} = \frac{(Q_{\text{atual}} \times C_{\text{atual}}) + (Q_{\text{comprada}} \times C_{\text{comprado}})}{Q_{\text{atual}} + Q_{\text{comprada}}}$$

### 3.3 CMV e Margem de Contribuição
Para cada produto cadastrado:
$$\text{CMV} = \sum_{i=1}^{n} (\text{quantidade\_necessaria}_i \times \text{custo\_unitario}_i)$$
$$\text{Margem Bruta (R\$)} = \text{Preço de Venda} - \text{CMV}$$
$$\text{Margem Bruta (\%)} = \left(\frac{\text{Margem Bruta}}{\text{Preço de Venda}}\right) \times 100$$

---

## 4. Algoritmo de Simulação Produtiva ("Com X de Y e C de B, quantos J?")

O serviço disponibiliza o método `simularCapacidadeProducao`:
1. **Entrada:** Identificação do produto final (`servico_id` ou nome) e lista de insumos disponíveis (informados explicitamente ou lidos do saldo em estoque).
2. **Cálculo de Capacidade:**
   Para cada insumo $i$ pertencente à ficha técnica do produto:
   $$\text{Capacidade}_i = \left\lfloor \frac{\text{QtdDisponível}_i}{\text{QtdNecessáriaNaReceita}_i} \right\rfloor$$
3. **Rendimento Máximo:**
   $$\text{Rendimento} = \min_{i}(\text{Capacidade}_i)$$
4. **Gargalo e Sobras:**
   - **Insumo Limitante:** Aquele(s) com $\text{Capacidade}_i = \text{Rendimento}$.
   - **Falta para próximo lote:** Para o insumo limitante, calcula-se:
     $$\text{Falta} = ((\text{Rendimento} + 1) \times \text{QtdNecessária}_i) - \text{QtdDisponível}_i$$
   - **Sobras:** Para os demais insumos:
     $$\text{Sobra}_j = \text{QtdDisponível}_j - (\text{Rendimento} \times \text{QtdNecessária}_j)$$

---

## 5. Fluxos de Integração Interna

### 5.1 Vendas e Orçamentos (`orcamentos`)
* Quando `PUT /api/orcamentos/:id/status` transiciona para `'APROVADO'`:
  * Em transação MySQL:
    * Se o item possui `controla_estoque_pronto = 1`: debita do saldo de produto pronto (`servicos.estoque_pronto_atual`).
    * Se `controla_estoque_pronto = 0` (sob encomenda): localiza a ficha técnica do item e debita os insumos proporcionais à quantidade vendida em `insumos.quantidade_atual`.
    * Grava linhas em `estoque_movimentacoes` com `tipo = 'SAIDA_VENDA'` e `orcamento_id`.
* Se o orçamento for cancelado, estorna os insumos e/ou produtos prontos.

### 5.2 Livro Caixa (`movimentacoes`)
* Ao registrar compra de insumos (`POST /api/estoque/insumos/entrada`):
  * Se `lancar_no_caixa = true` e houver `custo_total > 0`:
    * Insere registro em `movimentacoes` com `tipo = 'SAIDA'`, `categoria = 'Insumos/Matéria-Prima'`, `valor = custo_total`.
    * Vincula o ID gerado no campo `estoque_movimentacoes.movimentacao_financeira_id`.

### 5.3 Ordem de Produção (Pronta Entrega)
* Ao registrar `POST /api/estoque/producao`:
  * Debita os insumos da receita (`tipo = 'SAIDA_PRODUCAO'`).
  * Credita o saldo pronto em `servicos.estoque_pronto_atual` (`tipo = 'ENTRADA_PRODUCAO'`).

---

## 6. Especificação da API REST (Express)

Todos os endpoints operam sob o prefixo `/api/estoque` e exigem autenticação JWT:

1. `GET /api/estoque/insumos` — Lista insumos cadastrados (`busca`, `abaixo_minimo`).
2. `POST /api/estoque/insumos` — Cadastra novo insumo (`nome`, `unidade_base`, `estoque_minimo`, `custo_unitario`).
3. `PUT /api/estoque/insumos/:id` — Atualiza dados do insumo.
4. `DELETE /api/estoque/insumos/:id` — Desativa/remove insumo.
5. `POST /api/estoque/insumos/entrada` — Registra compra/entrada de insumo com opção de lançamento no Livro Caixa.
6. `GET /api/estoque/fichas-tecnicas/:servicoId` — Consulta receita detalhada e CMV do produto.
7. `POST /api/estoque/fichas-tecnicas` — Cria ou substitui os ingredientes da ficha técnica de um produto.
8. `POST /api/estoque/producao` — Registra lote de produção para pronta entrega.
9. `POST /api/estoque/simulacao` — Executa o motor de simulação produtiva.
10. `GET /api/estoque/movimentacoes` — Consulta extrato de movimentações de estoque com filtros por período e tipo.

---

## 7. Especificação das Ferramentas MCP (`ai-service/mcp_server`)

Paridade funcional estrita com o backend Node.js via chamadas HTTP autenticadas:

1. `listar_insumos_estoque(busca: Optional[str], apenas_abaixo_minimo: bool = False)`
2. `cadastrar_insumo(nome: str, unidade_base: str, estoque_minimo: float = 0.0, custo_unitario: float = 0.0)`
3. `registrar_compra_insumo(insumo_nome_ou_id: Any, quantidade: float, unidade: str, custo_total: Optional[float] = None, lancar_caixa: bool = True)`
4. `obter_ficha_tecnica_e_custo(servico_nome_ou_id: Any)`
5. `definir_ficha_tecnica(servico_nome_ou_id: Any, ingredientes: List[Dict[str, Any]])`
6. `registrar_lote_producao(servico_nome_ou_id: Any, quantidade: int)`
7. `simular_producao(servico_nome_ou_id: Any, insumos_informados: Optional[List[Dict[str, Any]]] = None, usar_estoque_atual: bool = False)`
8. `consultar_historico_estoque(limite: int = 20)`

---

## 8. Estratégia de Testes e Validação

1. **Testes Unitários Backend (`tests/estoque/`):**
   - Validação da conversão canônica de unidades (`kg ↔ g`, `L ↔ ml`).
   - Cálculo do Custo Médio Ponderado (CMP).
   - Motor de cálculo de rendimento, gargalos e sobras.
2. **Testes de Integração de API (`backend/tests/`):**
   - Compra de insumos com lançamento automático no livro caixa (`movimentacoes`).
   - Aprovação de orçamento sob encomenda com baixa automática atômica de insumos.
   - Tentativa de produção com estoque insuficiente (resposta 422 descritiva).
3. **Testes MCP (`ai-service/tests/test_mcp_estoque.py`):**
   - Teste das assinaturas das novas ferramentas e despacho para a API com mocks de resposta.
