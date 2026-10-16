-- Migração 012: Suporte a mensagens multimodais (áudio e imagem) no Assistente IA

ALTER TABLE mensagens
    ADD COLUMN tipo_midia ENUM('texto', 'audio', 'imagem') NOT NULL DEFAULT 'texto' AFTER papel,
    ADD COLUMN midia_mime_type VARCHAR(50) NULL AFTER tipo_midia,
    ADD COLUMN transcricao_audio TEXT NULL AFTER midia_mime_type,
    ADD INDEX idx_mensagens_tipo_midia (conversa_id, tipo_midia);
