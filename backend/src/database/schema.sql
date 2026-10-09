CREATE DATABASE IF NOT EXISTS mei_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mei_db;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Tabela de Usuários (MEIs)
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(180) NOT NULL,
    senha VARCHAR(255) NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_usuarios_email UNIQUE (email)
) ENGINE=InnoDB;

-- 2. Tabela de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nome VARCHAR(150) NOT NULL,
    telefone VARCHAR(20) NULL,
    email VARCHAR(180) NULL,
    endereco VARCHAR(255) NULL,
    observacoes TEXT NULL,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deletado_em DATETIME NULL,
    CONSTRAINT fk_clientes_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_clientes_usuario (usuario_id),
    INDEX idx_clientes_ativo (usuario_id, ativo)
) ENGINE=InnoDB;

-- 3. Tabela de Serviços e Produtos
CREATE TABLE IF NOT EXISTS servicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT NULL,
    preco DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    categoria VARCHAR(50) DEFAULT 'Geral',
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    controla_estoque_pronto TINYINT(1) NOT NULL DEFAULT 0,
    estoque_pronto_atual INT NOT NULL DEFAULT 0,
    estoque_pronto_minimo INT NOT NULL DEFAULT 0,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deletado_em DATETIME NULL,
    CONSTRAINT fk_servicos_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_servicos_preco CHECK (preco >= 0.00),
    INDEX idx_servicos_usuario (usuario_id),
    INDEX idx_servicos_ativo (usuario_id, ativo)
) ENGINE=InnoDB;

-- 4. Tabela de Orçamentos
CREATE TABLE IF NOT EXISTS orcamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    cliente_id INT NOT NULL,
    data_emissao DATE NOT NULL,
    validade DATE NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'RASCUNHO',
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    desconto DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    observacoes TEXT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_orcamentos_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_orcamentos_cliente FOREIGN KEY (cliente_id) 
        REFERENCES clientes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_orcamentos_subtotal CHECK (subtotal >= 0.00),
    CONSTRAINT chk_orcamentos_desconto CHECK (desconto >= 0.00),
    CONSTRAINT chk_orcamentos_total CHECK (total >= 0.00),
    CONSTRAINT chk_orcamentos_status CHECK (status IN ('RASCUNHO', 'ENVIADO', 'APROVADO', 'RECUSADO', 'CANCELADO')),
    INDEX idx_orcamentos_usuario (usuario_id),
    INDEX idx_orcamentos_usuario_status (usuario_id, status)
) ENGINE=InnoDB;

-- 5. Tabela de Itens do Orçamento
CREATE TABLE IF NOT EXISTS orcamento_itens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orcamento_id INT NOT NULL,
    servico_id INT NULL,
    quantidade INT NOT NULL DEFAULT 1,
    preco_unitario DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT fk_orcamento_itens_orcamento FOREIGN KEY (orcamento_id) 
        REFERENCES orcamentos(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_orcamento_itens_servico FOREIGN KEY (servico_id) 
        REFERENCES servicos(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_orc_itens_qtd CHECK (quantidade >= 1),
    CONSTRAINT chk_orc_itens_preco CHECK (preco_unitario >= 0.00),
    CONSTRAINT chk_orc_itens_subtotal CHECK (subtotal >= 0.00),
    INDEX idx_orcamento_itens_orcamento (orcamento_id)
) ENGINE=InnoDB;

-- 6. Tabela de Agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    cliente_id INT NOT NULL,
    orcamento_id INT NULL,
    servico_id INT NULL,
    data_hora DATETIME NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
    observacoes TEXT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_agendamentos_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_agendamentos_cliente FOREIGN KEY (cliente_id) 
        REFERENCES clientes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_agendamentos_orcamento FOREIGN KEY (orcamento_id) 
        REFERENCES orcamentos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_agendamentos_servico FOREIGN KEY (servico_id) 
        REFERENCES servicos(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT uk_agendamentos_horario UNIQUE (usuario_id, data_hora),
    CONSTRAINT chk_agendamentos_status CHECK (status IN ('PENDENTE', 'CONFIRMADO', 'CONCLUIDO', 'CANCELADO')),
    INDEX idx_agendamentos_usuario_data (usuario_id, data_hora),
    INDEX idx_agendamentos_orcamento (usuario_id, orcamento_id)
) ENGINE=InnoDB;

-- 7. Tabela de Cobranças
CREATE TABLE IF NOT EXISTS cobrancas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    cliente_id INT NOT NULL,
    agendamento_id INT NULL,
    orcamento_id INT NULL,
    valor DECIMAL(10,2) NOT NULL,
    vencimento DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
    data_pagamento DATE NULL,
    observacoes TEXT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cobrancas_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cobrancas_cliente FOREIGN KEY (cliente_id) 
        REFERENCES clientes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_cobrancas_agendamento FOREIGN KEY (agendamento_id) 
        REFERENCES agendamentos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_cobrancas_orcamento FOREIGN KEY (orcamento_id) 
        REFERENCES orcamentos(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_cobrancas_valor CHECK (valor > 0.00),
    CONSTRAINT chk_cobrancas_status CHECK (status IN ('PENDENTE', 'PAGO', 'CANCELADO', 'ATRASADO')),
    INDEX idx_cobrancas_usuario_venc (usuario_id, vencimento),
    INDEX idx_cobrancas_usuario_status_venc (usuario_id, status, vencimento),
    INDEX idx_cobrancas_agendamento (usuario_id, agendamento_id)
) ENGINE=InnoDB;

-- 8. Tabela de Movimentações (Livro Caixa)
CREATE TABLE IF NOT EXISTS movimentacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    cobranca_id INT NULL,
    tipo VARCHAR(10) NOT NULL,
    categoria VARCHAR(60) NOT NULL DEFAULT 'Geral',
    valor DECIMAL(10,2) NOT NULL,
    data_movimentacao DATE NOT NULL,
    descricao TEXT NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_movimentacoes_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_movimentacoes_cobranca FOREIGN KEY (cobranca_id) 
        REFERENCES cobrancas(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_movimentacoes_valor CHECK (valor > 0.00),
    CONSTRAINT chk_movimentacoes_tipo CHECK (tipo IN ('ENTRADA', 'SAIDA')),
    INDEX idx_movimentacoes_usuario_data (usuario_id, data_movimentacao),
    INDEX idx_movimentacoes_usuario_tipo_data (usuario_id, tipo, data_movimentacao)
) ENGINE=InnoDB;

-- 9. Tabela de Conversas com o Assistente IA
CREATE TABLE IF NOT EXISTS conversas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    titulo VARCHAR(120) NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_conversas_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_conversas_usuario_atualizado (usuario_id, atualizado_em)
) ENGINE=InnoDB;

-- 10. Tabela de Mensagens do Assistente IA
CREATE TABLE IF NOT EXISTS mensagens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversa_id INT NOT NULL,
    papel ENUM('usuario', 'assistente') NOT NULL,
    conteudo TEXT NOT NULL,
    fontes JSON NULL,
    tools_usadas JSON NULL,
    rag_backend VARCHAR(20) NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mensagens_conversa FOREIGN KEY (conversa_id) 
        REFERENCES conversas(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_mensagens_conversa_criado (conversa_id, criado_em)
) ENGINE=InnoDB;

-- 11. Tabela de Insumos (Módulo de Estoque)
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

-- 12. Tabela de Fichas Técnicas
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

-- 13. Tabela de Movimentações de Estoque
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

-- 14. Tabela de Notas Fiscais (Módulo Fiscal)
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
    chave_acesso VARCHAR(60) NULL,
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

-- 15. Tabela de Itens de Nota Fiscal
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

SET FOREIGN_KEY_CHECKS = 1;
