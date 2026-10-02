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

SET FOREIGN_KEY_CHECKS = 1;
