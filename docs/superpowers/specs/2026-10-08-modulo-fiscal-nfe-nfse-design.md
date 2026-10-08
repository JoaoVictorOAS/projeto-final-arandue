# Especificação Técnica — Módulo Fiscal: Emissão de NFS-e, NF-e e NFC-e no Padrão Nacional

- **Data:** 2026-10-08
- **Status:** Aprovado para Implementação
- **Escopo:** Emissão de Documentos Fiscais Eletrônicos (NFS-e Padrão Nacional, NF-e Modelo 55, NFC-e Modelo 65) via API REST e Assistente de IA (MCP) para Microempreendedores Individuais (MEI)
- **Autor/Arquitetura:** Pair Programming (Antigravity & Desenvolvedor)
- **Governança:** Diretrizes mandatórias de `GEMINI.md` (Paridade Total REST ↔ MCP, Isolamento Multi-Tenant e SSOT no Express)

---

## 1. Visão Geral e Objetivos

O presente documento especifica o **Módulo Fiscal do Aranduê**, permitindo que Microempreendedores Individuais (MEI) emitam, consultem e cancelem notas fiscais eletrônicas de forma simplificada, tanto pela interface visual quanto **conversando diretamente com o Assistente de IA**.

### Objetivos Principais
1. **Padrão Nacional Completo:**
   - **NFS-e (Nota Fiscal de Serviços Eletrônica):** Padrão Nacional estabelecido pelo Comitê Gestor do Simples Nacional / Receita Federal (formato DPS - Declaração de Prestação de Serviços, código de tributação nacional LC 116/03 e código de verificação).
   - **NF-e (Nota Fiscal Eletrônica - Modelo 55):** Padrão SEFAZ v4.00 com geração algorítmica de chave de acesso de 44 dígitos (dígito verificador Módulo 11), para venda e transporte de mercadorias.
   - **NFC-e (Nota Fiscal de Consumidor Eletrônica - Modelo 65):** Padrão SEFAZ para venda presencial no varejo com QR-Code de consulta pública.
2. **Emissão Conversacional com a IA:**
   - O MEI pode emitir notas com comandos naturais como: *"Emita uma NFS-e para o cliente Carlos de R$ 350,00 referente a manutenção de ar condicionado"* ou *"Gera uma NF-e de venda de 5 fardos de salgados para o CNPJ X"*.
3. **Paridade Rigorosa API REST ↔ MCP:**
   - Toda funcionalidade fiscal exposta via REST possui ferramenta correspondente no MCP Server (`ai-service/mcp_server/server.py`).
   - Nenhuma ferramenta MCP expõe `usuario_id` ou `tenant_id` em suas assinaturas.
4. **Integração Financeira Opcional e Desacoplamento:**
   - Permite vincular notas a clientes (`clientes`), orçamentos (`orcamentos`) e itens cadastrados (`servicos`), mas também suporta dados informados ad-hoc (avulsos) na conversa.
   - Permite inclusão automática de receita no Livro Caixa (`movimentacoes`).
   - **Zero conflito com o módulo de estoque e produtos desenvolvido em chat paralelo**, mantendo referências a itens de estoque e catálogo retrocompatíveis e desacopladas.

---

## 2. Modelo de Dados Relacional (MySQL)

A migração `backend/src/database/migrations/005_modulo_fiscal.sql` adiciona as tabelas relacionais com isolamento multi-tenant (`usuario_id`).

### 2.1 Tabela `notas_fiscais`
```sql
CREATE TABLE IF NOT EXISTS notas_fiscais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    cliente_id INT NULL,
    orcamento_id INT NULL,
    movimentacao_id INT NULL,
    tipo ENUM('NFSE', 'NFE', 'NFCE') NOT NULL,
    status ENUM('RASCUNHO', 'EMITIDA', 'CANCELADA', 'REJEITADA') NOT NULL DEFAULT 'EMITIDA',
    serie INT NOT NULL DEFAULT 1,
    numero INT NOT NULL,
    chave_acesso VARCHAR(44) NULL,
    protocolo_autorizacao VARCHAR(50) NULL,
    ambiente ENUM('HOMOLOGACAO', 'PRODUCAO') NOT NULL DEFAULT 'HOMOLOGACAO',
    
    -- Tomador / Destinatário
    destinatario_documento VARCHAR(20) NOT NULL,
    destinatario_nome VARCHAR(150) NOT NULL,
    destinatario_email VARCHAR(180) NULL,
    destinatario_telefone VARCHAR(20) NULL,
    destinatario_endereco TEXT NULL,
    
    -- Campos NFS-e (Padrão Nacional)
    codigo_tributacao_nacional VARCHAR(20) NULL,
    discriminacao_servico TEXT NULL,
    codigo_municipio_ibge VARCHAR(7) NULL,
    
    -- Campos NF-e / NFC-e
    natureza_operacao VARCHAR(100) NOT NULL DEFAULT 'Venda de mercadorias',
    consumidor_final TINYINT(1) NOT NULL DEFAULT 1,
    presenca_comprador TINYINT NOT NULL DEFAULT 1,
    forma_pagamento VARCHAR(30) NULL DEFAULT 'OUTROS',
    
    -- Valores Financeiros
    valor_total DECIMAL(10, 2) NOT NULL,
    valor_desconto DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    valor_liquido DECIMAL(10, 2) NOT NULL,
    
    -- Artefatos Fiscais
    xml_gerado MEDIUMTEXT NULL,
    link_danfe VARCHAR(255) NULL,
    motivo_cancelamento VARCHAR(255) NULL,
    
    data_emissao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_cancelamento DATETIME NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_nf_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_nf_cliente FOREIGN KEY (cliente_id) 
        REFERENCES clientes(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_nf_orcamento FOREIGN KEY (orcamento_id) 
        REFERENCES orcamentos(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_nf_movimentacao FOREIGN KEY (movimentacao_id) 
        REFERENCES movimentacoes(id) ON DELETE SET NULL ON UPDATE CASCADE,
        
    INDEX idx_nf_usuario_tipo (usuario_id, tipo),
    INDEX idx_nf_usuario_status (usuario_id, status),
    INDEX idx_nf_usuario_chave (usuario_id, chave_acesso),
    CONSTRAINT uk_nf_usuario_tipo_serie_num UNIQUE (usuario_id, tipo, serie, numero)
) ENGINE=InnoDB;
```

### 2.2 Tabela `nota_fiscal_itens`
```sql
CREATE TABLE IF NOT EXISTS nota_fiscal_itens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nota_fiscal_id INT NOT NULL,
    servico_id INT NULL,
    numero_item INT NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    ncm VARCHAR(8) NULL,
    cfop VARCHAR(4) NULL,
    unidade VARCHAR(10) NOT NULL DEFAULT 'UN',
    quantidade DECIMAL(12, 3) NOT NULL DEFAULT 1.000,
    valor_unitario DECIMAL(10, 2) NOT NULL,
    valor_total DECIMAL(10, 2) NOT NULL,
    regime_tributario VARCHAR(20) NOT NULL DEFAULT 'SIMEI',
    csosn VARCHAR(4) NOT NULL DEFAULT '102',
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_nfi_nota FOREIGN KEY (nota_fiscal_id) 
        REFERENCES notas_fiscais(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_nfi_servico FOREIGN KEY (servico_id) 
        REFERENCES servicos(id) ON DELETE SET NULL ON UPDATE CASCADE,
        
    INDEX idx_nfi_nota (nota_fiscal_id)
) ENGINE=InnoDB;
```

---

## 3. Motor Fiscal Backend Express (`backend/src/services/fiscal/`)

### 3.1 `geradorChaveAcesso.js`
Implementa o cálculo oficial de chave de acesso de 44 dígitos da SEFAZ para NF-e (modelo 55) e NFC-e (modelo 65):
$$\text{Chave} = \text{cUF}(2) + \text{AAMM}(4) + \text{CNPJ}(14) + \text{mod}(2) + \text{série}(3) + \text{número}(9) + \text{tpEmis}(1) + \text{cNF}(8) + \text{cDV}(1)$$
O dígito verificador ($\text{cDV}$) é calculado pelo algoritmo de ponderação Módulo 11 (pesos de 2 a 9).

### 3.2 `geradorXmlFiscal.js`
- **NFS-e Padrão Nacional:** Monta a estrutura canônica XML baseada em DPS (`<DPS><infDPS>...<prestador>...<tomador>...<servico>...</infDPS></DPS>`).
- **NF-e 4.0 e NFC-e:** Monta o layout SEFAZ oficial com `<NFe><infNFe>...<emit>...<dest>...<det>...<total>...<pag>...<infAdic>...</infNFe></NFe>`, aplicando automaticamente as legendas fiscais do Simples Nacional:
  *"DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NÃO GERA DIREITO A CRÉDITO FISCAL DE IPI / ICMS."*

### 3.3 `geradorDanfeSimplificado.js`
Gera a representação visual formatada (espelho do DANFE / cupom auxiliar) com:
- Cabeçalho do MEI emitente (nome, documento, regime tributário SIMEI);
- Número e série do documento fiscal;
- Chave de acesso formatada em blocos de 4 dígitos;
- Protocolo de autorização e data/hora;
- Relação de itens e discriminação de serviços/produtos;
- QR-Code de consulta e link para conferência.

### 3.4 `fiscalEngine.js`
- Controla a numeração sequencial segura dentro de transação MySQL (`SELECT COALESCE(MAX(numero), 0) + 1 FROM notas_fiscais WHERE usuario_id = ? AND tipo = ? AND serie = ? FOR UPDATE`).
- Valida campos obrigatórios conforme o tipo de nota.
- Emite e gera os artefatos (chave, protocolo, XML e DANFE).
- Se solicitado (`gerar_caixa: true`), cria automaticamente o lançamento correspondente na tabela `movimentacoes` (Livro Caixa) referenciando `movimentacao_id`.
- Trata cancelamentos (validação de motivo com no mínimo 15 caracteres e registro de `data_cancelamento`).

---

## 4. Endpoints REST da API Express

Localização: `backend/src/routes/notaFiscalRoutes.js` e `backend/src/controllers/notaFiscalController.js`.
Todos os endpoints são autenticados via `authMiddleware` (isolamento rigoroso de `usuario_id`).

1. `POST /api/notas-fiscais/nfse`:
   - Emite NFS-e Padrão Nacional.
   - Body: `{ destinatario_nome, destinatario_documento, discriminacao_servico, valor, codigo_tributacao_nacional?, cliente_id?, gerar_caixa? }`
2. `POST /api/notas-fiscais/nfe`:
   - Emite NF-e Modelo 55 (produtos/mercadorias).
   - Body: `{ destinatario_nome, destinatario_documento, itens: [{ descricao, quantidade, valor_unitario, ncm?, cfop?, servico_id? }], natureza_operacao?, cliente_id?, orcamento_id?, gerar_caixa? }`
3. `POST /api/notas-fiscais/nfce`:
   - Emite NFC-e Modelo 65 (varejo consumidor).
   - Body: `{ destinatario_documento?, destinatario_nome?, itens: [{ descricao, quantidade, valor_unitario }], forma_pagamento?, gerar_caixa? }`
4. `GET /api/notas-fiscais`:
   - Lista histórico com filtros (`tipo`, `status`, `data_inicio`, `data_fim`, paginação).
5. `GET /api/notas-fiscais/:id`:
   - Consulta detalhada da nota e seus itens.
6. `GET /api/notas-fiscais/:id/danfe`:
   - Retorna espelho legível / DANFE simplificado da nota.
7. `POST /api/notas-fiscais/:id/cancelar`:
   - Cancela nota autorizada com `{ motivo }` (mínimo 15 caracteres).

---

## 5. Ferramentas MCP no Servidor de IA (`ai-service/mcp_server/server.py`)

Em observância às regras do `GEMINI.md`:
- Nenhuma ferramenta MCP expõe `usuario_id`.
- O MCP consome exclusivamente as rotas HTTP da API REST via `TENANT_TOKEN`.

### 5.1 Especificação das Ferramentas MCP
1. `emitir_nfse_nacional(destinatario_nome, destinatario_documento, discriminacao_servico, valor, codigo_tributacao_nacional="01.07.01", gerar_caixa=True)`:
   - Emite NFS-e de serviços no Padrão Nacional.
2. `emitir_nfe_produtos(destinatario_nome, destinatario_documento, itens, natureza_operacao="Venda de mercadorias", gerar_caixa=True)`:
   - Emite NF-e (Modelo 55) para vendas de mercadorias.
3. `emitir_nfce_consumidor(itens, forma_pagamento="DINHEIRO", destinatario_cpf="", gerar_caixa=True)`:
   - Emite NFC-e (Modelo 65) no varejo ao consumidor.
4. `listar_notas_fiscais(tipo=None, status=None, limite=20)`:
   - Lista notas emitidas pelo MEI para consulta no chat.
5. `consultar_nota_fiscal(nota_id=None, chave_acesso=None)`:
   - Obtém detalhes, itens e link/espelho do DANFE da nota.
6. `cancelar_nota_fiscal(nota_id, motivo)`:
   - Cancela uma nota autorizada informando justificativa.

### 5.2 Diretrizes do Assistente de IA (`ai-service/app/llm/prompts.py`)
- O prompt é atualizado para instruir o modelo a:
  - Identificar a intenção fiscal do usuário (serviço vs produto vs consumidor).
  - Solicitar dados essenciais faltantes de forma educada caso necessário (ex.: documento do destinatário para NF-e/NFS-e).
  - Confirmar a emissão exibindo número da nota, valor, protocolo e chave de acesso.

---

## 6. Plano de Testes Automatizados

1. **Testes Unitários (`backend/tests/unit/fiscalEngine.test.js`):**
   - Validação matemática do dígito verificador Módulo 11 da chave de acesso.
   - Validação da estrutura XML da NFS-e Nacional (DPS) e NF-e Modelo 55 SEFAZ.
   - Aplicação de regras fiscais do SIMEI (CSOSN 102/400 e ausência de destaque de ICMS/ISS).
2. **Testes de Integração API REST (`backend/tests/integration/notasFiscais.test.js`):**
   - Emissão de NFS-e, NF-e e NFC-e com sucesso.
   - Atomicidade da numeração sequencial por usuário e série.
   - Lançamento automático em `movimentacoes` (Livro Caixa) quando `gerar_caixa: true`.
   - Cancelamento com motivo mínimo de 15 caracteres.
   - Isolamento multi-tenant (impedir acesso a notas de outro usuário).
3. **Testes do Servidor MCP (`ai-service/tests/test_mcp_fiscal.py`):**
   - Ausência de parâmetros de tenant nos esquemas das ferramentas MCP.
   - Execução bem-sucedida das ferramentas via chamadas HTTP mockadas (`respx`).
   - Retornos amigáveis para o orquestrador do LLM.
