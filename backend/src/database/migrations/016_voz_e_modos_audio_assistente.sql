-- Migração 016: Suporte a Voz Configurável e Modo Ambos de Resposta

ALTER TABLE mei_configuracoes
    MODIFY COLUMN preferencia_resposta ENUM('texto', 'audio', 'ambos') NOT NULL DEFAULT 'texto',
    ADD COLUMN voz_assistente VARCHAR(50) NOT NULL DEFAULT 'pt-BR-FranciscaNeural' AFTER preferencia_resposta;

ALTER TABLE mensagens
    ADD COLUMN audio_base64 MEDIUMTEXT NULL AFTER midia_mime_type;
