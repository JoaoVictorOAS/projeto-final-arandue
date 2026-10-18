-- Migração 014: Suporte a Serviços Recorrentes e Tabela de Assinaturas

-- 1. Alterações na tabela servicos para suportar recorrência e padrões de assinatura
ALTER TABLE servicos
    ADD COLUMN recorrente TINYINT(1) NOT NULL DEFAULT 0 AFTER ativo,
    ADD COLUMN periodicidade VARCHAR(20) NULL DEFAULT NULL AFTER recorrente,
    ADD COLUMN dia_vencimento_padrao INT NULL DEFAULT NULL AFTER periodicidade;

-- 2. Tabela de Assinaturas (Planos/Serviços Recorrentes Contratados por Clientes)
CREATE TABLE IF NOT EXISTS assinaturas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    cliente_id INT NOT NULL,
    servico_id INT NOT NULL,
    valor DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    periodicidade VARCHAR(20) NOT NULL DEFAULT 'MENSAL',
    dia_vencimento INT NOT NULL DEFAULT 10,
    data_inicio DATE NOT NULL,
    proximo_vencimento DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVA',
    observacoes TEXT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_assinaturas_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_assinaturas_cliente FOREIGN KEY (cliente_id) 
        REFERENCES clientes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_assinaturas_servico FOREIGN KEY (servico_id) 
        REFERENCES servicos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_assinaturas_usuario (usuario_id),
    INDEX idx_assinaturas_cliente (cliente_id),
    INDEX idx_assinaturas_servico (servico_id),
    INDEX idx_assinaturas_usuario_status (usuario_id, status),
    INDEX idx_assinaturas_proximo_vencimento (usuario_id, proximo_vencimento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
