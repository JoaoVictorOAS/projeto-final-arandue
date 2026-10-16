-- Migração 013: Criação da tabela temas_usuario
CREATE TABLE IF NOT EXISTS temas_usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    modo ENUM('light', 'dark') NOT NULL DEFAULT 'light',
    descricao VARCHAR(255) NULL,
    eh_ativo TINYINT(1) NOT NULL DEFAULT 0,
    eh_sistema TINYINT(1) NOT NULL DEFAULT 0,
    origem ENUM('SISTEMA', 'UPLOAD', 'IA', 'CUSTOMIZADO') NOT NULL DEFAULT 'CUSTOMIZADO',
    tokens JSON NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_temas_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_temas_usuario (usuario_id),
    INDEX idx_temas_ativo (usuario_id, eh_ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
