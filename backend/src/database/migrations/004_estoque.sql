-- Migração 004: Módulo de Estoque, Ficha Técnica e Movimentações

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

-- Adiciona campos de estoque pronto em servicos caso não existam
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'servicos' 
      AND COLUMN_NAME = 'controla_estoque_pronto'
);

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE servicos ADD COLUMN controla_estoque_pronto TINYINT(1) NOT NULL DEFAULT 0, ADD COLUMN estoque_pronto_atual INT NOT NULL DEFAULT 0, ADD COLUMN estoque_pronto_minimo INT NOT NULL DEFAULT 0;', 
    'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
