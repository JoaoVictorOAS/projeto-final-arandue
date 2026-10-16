-- Migração 011: Integração do Assistente IA com WhatsApp (Multitenant por telefone)

ALTER TABLE usuarios
    ADD COLUMN whatsapp VARCHAR(20) NULL AFTER email,
    ADD COLUMN whatsapp_verificado TINYINT(1) NOT NULL DEFAULT 0 AFTER whatsapp,
    ADD CONSTRAINT uk_usuarios_whatsapp UNIQUE (whatsapp);

ALTER TABLE conversas
    ADD COLUMN canal ENUM('web', 'whatsapp') NOT NULL DEFAULT 'web' AFTER titulo,
    ADD INDEX idx_conversas_usuario_canal (usuario_id, canal, atualizado_em);
