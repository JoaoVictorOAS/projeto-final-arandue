-- Migração 005: Módulo Fiscal (NFS-e Nacional, NF-e mod 55, NFC-e mod 65)

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
