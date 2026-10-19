-- Migração 015: Preferência de Retorno do Assistente IA (Texto vs Áudio)

ALTER TABLE mei_configuracoes
    ADD COLUMN preferencia_resposta ENUM('texto', 'audio') NOT NULL DEFAULT 'texto' AFTER ambiente_fiscal;
