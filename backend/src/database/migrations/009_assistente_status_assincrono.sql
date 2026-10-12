-- Migração 009: Suporte a processamento assíncrono e short-polling no Assistente IA
ALTER TABLE mensagens
    MODIFY COLUMN conteudo TEXT NULL,
    ADD COLUMN status ENUM('processando', 'concluida', 'erro') NOT NULL DEFAULT 'concluida' AFTER papel,
    ADD COLUMN erro_mensagem VARCHAR(500) NULL AFTER status,
    ADD INDEX idx_mensagens_conversa_status (conversa_id, status);
