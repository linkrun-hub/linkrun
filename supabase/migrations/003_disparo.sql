-- ============================================================
-- MIGRATION 003 — Motor de Disparo
-- Rodar após 002_campanhas.sql
-- ============================================================

-- Contas de envio (números WhatsApp)
CREATE TABLE IF NOT EXISTS sending_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          TEXT NOT NULL,
  numero        TEXT NOT NULL,
  webhook_url   TEXT,           -- URL do BotConversa para este número
  ativo         BOOLEAN DEFAULT TRUE,
  limite_diario INT DEFAULT 150,
  enviados_hoje INT DEFAULT 0,
  ultimo_reset  DATE DEFAULT CURRENT_DATE,
  modo_warmup   BOOLEAN DEFAULT FALSE,
  warmup_dia    INT DEFAULT 1,  -- dia atual do warmup (sobe gradualmente)
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Fila de disparo
CREATE TABLE IF NOT EXISTS fila_disparo (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id             UUID REFERENCES leads(id),
  campanha_id         UUID REFERENCES campanhas(id),
  etapa_id            UUID REFERENCES campanha_etapas(id),
  template_id         UUID REFERENCES templates_mensagem(id),
  sending_account_id  UUID REFERENCES sending_accounts(id),
  agendado_para       TIMESTAMPTZ NOT NULL,
  status              TEXT DEFAULT 'pendente',  -- pendente|enviando|enviado|falhou|cancelado
  tentativas          INT DEFAULT 0,
  enviado_em          TIMESTAMPTZ,
  erro                TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Log histórico de disparos
CREATE TABLE IF NOT EXISTS log_disparo (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fila_id             UUID REFERENCES fila_disparo(id),
  lead_id             UUID REFERENCES leads(id),
  campanha_id         UUID REFERENCES campanhas(id),
  template_id         UUID REFERENCES templates_mensagem(id),
  numero_destinatario TEXT,
  conteudo_enviado    TEXT,
  status              TEXT,  -- enviado|respondeu|bloqueou|optout|falhou
  enviado_em          TIMESTAMPTZ DEFAULT NOW(),
  respondeu_em        TIMESTAMPTZ,
  bloqueou_em         TIMESTAMPTZ
);

-- Timeline de interações por lead
CREATE TABLE IF NOT EXISTS interacoes_lead (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id   UUID REFERENCES leads(id) ON DELETE CASCADE,
  tipo      TEXT NOT NULL,  -- mensagem_enviada|resposta_recebida|optout|etapa_mudou|nota
  descricao TEXT,
  metadata  JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_fila_status     ON fila_disparo(status);
CREATE INDEX IF NOT EXISTS idx_fila_agendado   ON fila_disparo(agendado_para);
CREATE INDEX IF NOT EXISTS idx_fila_lead       ON fila_disparo(lead_id);
CREATE INDEX IF NOT EXISTS idx_log_lead        ON log_disparo(lead_id);
CREATE INDEX IF NOT EXISTS idx_log_campanha    ON log_disparo(campanha_id);
CREATE INDEX IF NOT EXISTS idx_log_status      ON log_disparo(status);
CREATE INDEX IF NOT EXISTS idx_interacoes_lead ON interacoes_lead(lead_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_tipo ON interacoes_lead(tipo);

-- RLS
ALTER TABLE sending_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fila_disparo     ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_disparo      ENABLE ROW LEVEL SECURITY;
ALTER TABLE interacoes_lead  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON sending_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON fila_disparo     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON log_disparo      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON interacoes_lead  FOR ALL USING (true) WITH CHECK (true);
