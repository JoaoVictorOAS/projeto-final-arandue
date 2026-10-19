-- Migração 017: Suporte ao Provedor ElevenLabs e Expansão do Identificador de Voz
ALTER TABLE mei_configuracoes
    MODIFY COLUMN voz_assistente VARCHAR(100) NOT NULL DEFAULT 'pt-BR-FranciscaNeural',
    ADD COLUMN provedor_tts ENUM('auto', 'elevenlabs', 'edge-tts') NOT NULL DEFAULT 'auto' AFTER voz_assistente;
