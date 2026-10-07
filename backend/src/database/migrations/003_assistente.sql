-- Migração 003: Tabelas para o Assistente IA do MEI (Conversas e Mensagens)

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
