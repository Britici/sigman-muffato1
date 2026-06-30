-- ============================================================
-- SIGMAN v2.0 — schema.sql
-- PostgreSQL 15+
-- Gerado: 2026-06-16
-- ============================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- buscas sem acento

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE perfil_tipo AS ENUM (
    'admin',
    'pcm',
    'manutencao',
    'administrativo',
    'producao'
);

CREATE TYPE nivel_permissao AS ENUM (
    'nenhum',
    'visualizar',
    'operar',
    'aprovar'
);

CREATE TYPE os_tipo AS ENUM (
    'Corretiva',
    'Preventiva',
    'Preditiva',
    'Inspeção',
    'Melhoria'
);

CREATE TYPE os_origem AS ENUM (
    'direta',   -- abertura direta (qualquer perfil)
    'plan'      -- gerada de planejada (PCM)
);

CREATE TYPE os_status AS ENUM (
    'aberta',
    'em_andamento',
    'aguardando_aprovacao',
    'concluida',
    'cancelada'
);

CREATE TYPE intervalo_status AS ENUM (
    'em_andamento',
    'concluido'
);

CREATE TYPE planejada_status AS ENUM (
    'Pendente',
    'Em andamento',
    'Concluída',
    'Atrasada',
    'Cancelada'
);

CREATE TYPE periodicidade_tipo AS ENUM (
    'Diária',
    'Semanal',
    'Quinzenal',
    'Mensal',
    'Trimestral',
    'Semestral',
    'Anual'
);

CREATE TYPE criticidade_nivel AS ENUM ('A', 'B', 'C');

-- Unidade da periodicidade preventiva cadastrada na Máquina (Ativos).
-- Distinto de periodicidade_tipo (usado em preventiva_templates/execucoes),
-- que permanece como está — fora do escopo desta reestruturação.
CREATE TYPE periodicidade_unidade_tipo AS ENUM (
    'dias',
    'semanas',
    'mes',
    'ano'
);

-- ============================================================
-- 1. USUARIOS
-- ============================================================

CREATE TABLE usuarios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    login           VARCHAR(50)  NOT NULL UNIQUE,
    nome            VARCHAR(120) NOT NULL,
    email           VARCHAR(200) UNIQUE,          -- Google OAuth email
    google_sub      VARCHAR(200) UNIQUE,          -- Google subject ID
    perfil          perfil_tipo  NOT NULL,
    ativo           BOOLEAN      NOT NULL DEFAULT true,
    criado_em       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    atualizado_em   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON COLUMN usuarios.google_sub IS 'ID único do Google OAuth2 — não armazenar senha';

-- ============================================================
-- 2. PERMISSOES (por perfil × módulo)
-- ============================================================

CREATE TABLE permissoes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    perfil          perfil_tipo     NOT NULL,
    modulo          VARCHAR(60)     NOT NULL,   -- 'ordens_servico', 'preventiva', 'racr', etc.
    nivel           nivel_permissao NOT NULL DEFAULT 'nenhum',
    UNIQUE (perfil, modulo)
);

-- ============================================================
-- 2b. PERMISSOES_USUARIO (override individual por usuário)
-- Sobrescreve a permissão do perfil para módulos específicos
-- ============================================================

CREATE TABLE permissoes_usuario (
    usuario_id  UUID            NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    modulo      VARCHAR(60)     NOT NULL,
    nivel       nivel_permissao NOT NULL,
    PRIMARY KEY (usuario_id, modulo)
);

CREATE INDEX idx_perm_usuario ON permissoes_usuario(usuario_id);

-- Função: resolve permissão efetiva (override > perfil > nenhum)
CREATE OR REPLACE FUNCTION fn_permissao_efetiva(
    p_usuario_id UUID,
    p_perfil     perfil_tipo,
    p_modulo     VARCHAR
) RETURNS nivel_permissao AS $$
    SELECT COALESCE(
        (SELECT nivel FROM permissoes_usuario
         WHERE usuario_id = p_usuario_id AND modulo = p_modulo),
        (SELECT nivel FROM permissoes
         WHERE perfil = p_perfil AND modulo = p_modulo),
        'nenhum'::nivel_permissao
    );
$$ LANGUAGE sql STABLE;

-- ============================================================
-- 3. HIERARQUIA DE ATIVOS: UNIDADES → LOCAIS → AMBIENTES → SALAS
-- Nome sempre normalizado para MAIÚSCULAS no save (regra de app).
-- Nome único por pai em cada nível (índice único composto).
-- Sala nunca é excluída — só inativada/renomeada.
-- ============================================================

CREATE TABLE unidades (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome            VARCHAR(120) NOT NULL UNIQUE,
    ativo           BOOLEAN      NOT NULL DEFAULT true,
    criado_em       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    atualizado_em   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE locais (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unidade_id      UUID         NOT NULL REFERENCES unidades(id),
    nome            VARCHAR(120) NOT NULL,
    ativo           BOOLEAN      NOT NULL DEFAULT true,
    criado_em       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    atualizado_em   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (unidade_id, nome)
);

CREATE INDEX idx_locais_unidade ON locais(unidade_id);

CREATE TABLE ambientes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id        UUID         NOT NULL REFERENCES locais(id),
    nome            VARCHAR(120) NOT NULL,
    ativo           BOOLEAN      NOT NULL DEFAULT true,
    criado_em       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    atualizado_em   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (local_id, nome)
);

CREATE INDEX idx_ambientes_local ON ambientes(local_id);

CREATE TABLE salas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ambiente_id     UUID         NOT NULL REFERENCES ambientes(id),
    nome            VARCHAR(120) NOT NULL,
    descricao       TEXT,
    ativo           BOOLEAN      NOT NULL DEFAULT true,
    criado_em       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    atualizado_em   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (ambiente_id, nome)
);

CREATE INDEX idx_salas_ambiente ON salas(ambiente_id);

-- ============================================================
-- 3b. HIERARQUIA ORGANIZACIONAL E ESCOPO DE APROVAÇÃO (2026-06-27)
-- Substitui aprovadores_local (checkbox manual por Sala) — aprovação
-- e pré-preenchimento de Abertura agora vêm do cargo da pessoa.
-- Dois "lados" (produção / manutenção), 4 níveis cada:
--   1 Diretoria | 2 Gerência (prod) / Coordenador (manut)
--   3 Coordenação (prod) / Supervisor (manut) | 4 Produção / Manutenção
-- Nível 1 = escopo universal (não usa usuario_escopo). Nível 2 = escopo
-- em Local. Níveis 3 e 4 = escopo em Ambiente. Uma pessoa pode ter
-- vários nós de escopo (ex: coordenador cobrindo 2 ambientes).
-- ============================================================

CREATE TYPE lado_tipo AS ENUM ('producao', 'manutencao', 'ambos');

ALTER TABLE usuarios
    ADD COLUMN lado  lado_tipo,
    ADD COLUMN nivel SMALLINT CHECK (nivel BETWEEN 1 AND 4);

CREATE TABLE usuario_escopo (
    usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    local_id    UUID REFERENCES locais(id)    ON DELETE CASCADE,
    ambiente_id UUID REFERENCES ambientes(id) ON DELETE CASCADE,
    CHECK (num_nonnulls(local_id, ambiente_id) = 1),
    UNIQUE (usuario_id, local_id, ambiente_id)
);

CREATE INDEX idx_usuario_escopo_usuario ON usuario_escopo(usuario_id);

-- ============================================================
-- 4. FAMILIAS DE EQUIPAMENTO
-- Agrupa máquinas por fabricante + tipo para herdar checklist preventivo
-- ============================================================

CREATE TABLE familias_equipamento (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fabricante      VARCHAR(100) NOT NULL,   -- ex: 'ULMA'
    tipo            VARCHAR(100) NOT NULL,   -- ex: 'Termoformadora'
    descricao       TEXT,
    criado_em       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (fabricante, tipo)
);

-- ============================================================
-- 5. MAQUINAS
-- tag é única GLOBALMENTE (qualquer sala). nome PODE repetir.
-- periodicidade vira número + unidade (valor padrão sugerido para
-- o futuro template de preventiva).
-- ============================================================

CREATE TABLE maquinas (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sala_id                 UUID         NOT NULL REFERENCES salas(id),
    familia_id              UUID         REFERENCES familias_equipamento(id),
    nome                    VARCHAR(200) NOT NULL,
    tag                     VARCHAR(50)  NOT NULL UNIQUE,
    criticidade             SMALLINT     NOT NULL DEFAULT 3
                            CHECK (criticidade BETWEEN 1 AND 4),
    periodicidade_numero    INTEGER      NOT NULL DEFAULT 1
                            CHECK (periodicidade_numero > 0),
    periodicidade_unidade   periodicidade_unidade_tipo NOT NULL DEFAULT 'mes',
    descricao               TEXT,
    ativo                   BOOLEAN      NOT NULL DEFAULT true,
    criado_em               TIMESTAMPTZ  NOT NULL DEFAULT now(),
    atualizado_em           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_maquinas_sala ON maquinas(sala_id);

COMMENT ON COLUMN maquinas.criticidade IS '1=crítico (vermelho), 2=alta (laranja), 3=média (amarelo), 4=baixa (verde)';
COMMENT ON COLUMN maquinas.periodicidade_numero IS 'Valor padrão sugerido ao criar o template de preventiva (fase futura)';

-- ============================================================
-- 6. ORDENS DE SERVICO
-- Unifica OS diretas, geradas de solicitação e geradas de planejada
-- ============================================================

CREATE TABLE ordens_servico (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    os_numero               VARCHAR(20) NOT NULL UNIQUE,  -- ex: OS-0146
    data                    DATE        NOT NULL,
    sala_id                 UUID        NOT NULL REFERENCES salas(id),
    maquina_id              UUID         REFERENCES maquinas(id),
    maquina_livre           VARCHAR(200),   -- quando maquina_id IS NULL (__outros__)
    tag_maquina             VARCHAR(50),
    tipo                    os_tipo     NOT NULL,
    prioridade              SMALLINT    NOT NULL DEFAULT 3
                            CHECK (prioridade BETWEEN 1 AND 4),
    -- Pessoas
    solicitante_id          UUID        REFERENCES usuarios(id),
    solicitante_nome        VARCHAR(120),   -- desnormalizado para histórico
    executante_id           UUID        REFERENCES usuarios(id),
    executante_nome         VARCHAR(120),
    -- Conteúdo
    problema                TEXT        NOT NULL,
    acao_executada          TEXT,
    acao_preventiva         TEXT,
    foto_url                TEXT,
    pecas_utilizadas        TEXT,
    -- Origem / rastreabilidade
    origem                  os_origem   NOT NULL DEFAULT 'direta',
    origem_ref              VARCHAR(20),    -- ex: SOL-0001, PL-0001
    -- Tempos (preenchidos manualmente, calculados no backend)
    hora_inicio             TIME,
    hora_fim                TIME,
    duracao_min             INTEGER,
    tempo_parada_min        INTEGER,
    -- Status e aprovação
    status                  os_status   NOT NULL DEFAULT 'aberta',
    aprovado_supervisao_prod    BOOLEAN,
    aprovado_supervisao_manut   BOOLEAN,
    aprovador_prod_id           UUID    REFERENCES usuarios(id),
    aprovador_manut_id          UUID    REFERENCES usuarios(id),
    aprovado_prod_em            TIMESTAMPTZ,
    aprovado_manut_em           TIMESTAMPTZ,
    aprovacao_bloqueada         BOOLEAN NOT NULL DEFAULT false,
    -- Metadados
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN ordens_servico.maquina_livre IS 'Nome livre quando ativo não está cadastrado (equivalente ao __outros__ do v1)';
COMMENT ON COLUMN ordens_servico.duracao_min IS 'Duração total do atendimento em minutos';
COMMENT ON COLUMN ordens_servico.tempo_parada_min IS 'Tempo de parada da produção em minutos — pode diferir da duração';

-- Índices para queries frequentes
CREATE INDEX idx_os_data          ON ordens_servico(data);
CREATE INDEX idx_os_sala          ON ordens_servico(sala_id);
CREATE INDEX idx_os_maquina       ON ordens_servico(maquina_id);
CREATE INDEX idx_os_status        ON ordens_servico(status);
CREATE INDEX idx_os_tipo          ON ordens_servico(tipo);
CREATE INDEX idx_os_executante    ON ordens_servico(executante_id);
CREATE INDEX idx_os_criado_em     ON ordens_servico(criado_em);

-- ============================================================
-- 7. OS_INTERVALOS
-- Múltiplos períodos de atendimento por OS
-- ============================================================

CREATE TABLE os_intervalos (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id               UUID        NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
    manutentor_id       UUID        REFERENCES usuarios(id),
    manutentor_nome     VARCHAR(120),
    hora_inicio         TIMESTAMPTZ NOT NULL,
    hora_fim            TIMESTAMPTZ,
    tarefas_executadas  TEXT,
    status              intervalo_status NOT NULL DEFAULT 'em_andamento',
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_intervalos_os ON os_intervalos(os_id);

-- ============================================================
-- 8. OS_PLANEJADAS
-- ============================================================

CREATE TABLE os_planejadas (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    pl_numero           VARCHAR(20) NOT NULL UNIQUE,   -- ex: PL-0003
    sala_id             UUID        NOT NULL REFERENCES salas(id),
    maquina_id          UUID         REFERENCES maquinas(id),
    maquina_livre       VARCHAR(200),
    tag_maquina         VARCHAR(50),
    tipo                os_tipo     NOT NULL,
    prioridade          SMALLINT    NOT NULL DEFAULT 3
                        CHECK (prioridade BETWEEN 1 AND 4),
    prazo_limite        DATE,
    horas_turno         NUMERIC(4,1),
    descricao_planejada TEXT        NOT NULL,
    status              planejada_status NOT NULL DEFAULT 'Pendente',
    -- Execução
    manutentor_exec_id  UUID        REFERENCES usuarios(id),
    manutentor_exec_nome VARCHAR(120),
    data_execucao       DATE,
    hora_inicio         TIME,
    hora_fim            TIME,
    duracao_min         INTEGER,
    servico_executado   TEXT,
    os_gerada_id        UUID        REFERENCES ordens_servico(id),  -- OS criada a partir desta
    -- Metadados
    criado_por_id       UUID        REFERENCES usuarios(id),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
    concluido_em        TIMESTAMPTZ,
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_planejadas_status    ON os_planejadas(status);
CREATE INDEX idx_planejadas_prazo     ON os_planejadas(prazo_limite);

-- ============================================================
-- 10. PREVENTIVA_TEMPLATES
-- Checklists por familia de equipamento
-- TODO (fase futura, fora desta rodada): renomear a coluna
-- "criticidade" (ENUM A/B/C) abaixo para "prioridade", para não
-- colidir semanticamente com maquinas.criticidade (1-4).
-- ============================================================

CREATE TABLE preventiva_templates (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    familia_id      UUID        NOT NULL REFERENCES familias_equipamento(id) ON DELETE CASCADE,
    tarefa          TEXT        NOT NULL,
    periodicidade   periodicidade_tipo NOT NULL,
    tempo_estimado_min INTEGER,
    criticidade     criticidade_nivel NOT NULL DEFAULT 'B',
    ordem           SMALLINT    NOT NULL DEFAULT 0,
    ativo           BOOLEAN     NOT NULL DEFAULT true,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prev_template_familia ON preventiva_templates(familia_id);

-- ============================================================
-- 11. PREVENTIVA_EXECUCOES
-- ============================================================

CREATE TABLE preventiva_execucoes (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id      UUID         NOT NULL REFERENCES maquinas(id),
    template_id     UUID        REFERENCES preventiva_templates(id),
    tarefa          TEXT        NOT NULL,   -- cópia da tarefa no momento da execução
    periodicidade   periodicidade_tipo NOT NULL,
    manutentor_id   UUID        REFERENCES usuarios(id),
    manutentor_nome VARCHAR(120),
    data_execucao   DATE        NOT NULL,
    duracao_min     INTEGER,
    materiais       TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'concluida',
    observacoes     TEXT,
    os_id           UUID        REFERENCES ordens_servico(id),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prev_exec_maquina ON preventiva_execucoes(maquina_id);
CREATE INDEX idx_prev_exec_data    ON preventiva_execucoes(data_execucao);

-- ============================================================
-- 12. INSPECOES_ROTA
-- ============================================================

CREATE TABLE inspecoes_rota (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    data            DATE        NOT NULL,
    turno           SMALLINT    CHECK (turno BETWEEN 1 AND 3),
    manutentor_id   UUID        REFERENCES usuarios(id),
    manutentor_nome VARCHAR(120),
    sala_id         UUID        REFERENCES salas(id),
    ponto_inspecao  VARCHAR(200),
    item            VARCHAR(200),
    status          VARCHAR(30),
    hora            TIME,
    valor_medido    NUMERIC(10,3),
    limite_min      NUMERIC(10,3),
    limite_max      NUMERIC(10,3),
    observacoes     TEXT,
    acao_necessaria TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_insp_rota_data ON inspecoes_rota(data);

-- ============================================================
-- 13. INSPECOES_MAQUINA
-- ============================================================

CREATE TABLE inspecoes_maquina (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    data            DATE        NOT NULL,
    maquina_id      UUID         REFERENCES maquinas(id),
    maquina_nome    VARCHAR(200),
    tag             VARCHAR(50),
    manutentor_id   UUID        REFERENCES usuarios(id),
    manutentor_nome VARCHAR(120),
    sistema         VARCHAR(100),
    item_verificado VARCHAR(200),
    status          VARCHAR(30),
    valor_medido    NUMERIC(10,3),
    unidade         VARCHAR(20),
    observacoes     TEXT,
    acao_necessaria TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_insp_maquina_data    ON inspecoes_maquina(data);
CREATE INDEX idx_insp_maquina_maquina ON inspecoes_maquina(maquina_id);

-- ============================================================
-- 14. RAC — Análise de Causa Raiz
-- ============================================================

CREATE TABLE racr (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    racr_numero         VARCHAR(20) NOT NULL UNIQUE,   -- ex: RAC-0001
    data_abertura       DATE        NOT NULL DEFAULT CURRENT_DATE,
    os_id               UUID        REFERENCES ordens_servico(id),
    os_numero           VARCHAR(20),
    maquina_id          UUID         REFERENCES maquinas(id),
    maquina_nome        VARCHAR(200),
    sala_id             UUID        REFERENCES salas(id),
    criticidade         SMALLINT    CHECK (criticidade BETWEEN 1 AND 4),
    tempo_parada_min    INTEGER,
    limite_min          INTEGER,
    -- Descrição do problema
    falha               TEXT        NOT NULL,
    causa_raiz          TEXT,
    -- 5 Porquês
    why1                TEXT,
    why2                TEXT,
    why3                TEXT,
    why4                TEXT,
    why5                TEXT,
    -- Ações
    acao_imediata       TEXT,
    acao_preventiva     TEXT,
    -- Responsáveis
    resp_producao_id    UUID        REFERENCES usuarios(id),
    resp_producao_nome  VARCHAR(120),
    resp_manutencao_id  UUID        REFERENCES usuarios(id),
    resp_manutencao_nome VARCHAR(120),
    executantes         TEXT,
    -- Status
    status              VARCHAR(30) NOT NULL DEFAULT 'aberta',
    data_fechamento     DATE,
    fechado_por_id      UUID        REFERENCES usuarios(id),
    fechado_por_nome    VARCHAR(120),
    -- Metadados
    criado_por_id       UUID        REFERENCES usuarios(id),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_racr_os     ON racr(os_id);
CREATE INDEX idx_racr_status ON racr(status);

-- ============================================================
-- 15. HISTORICO_AUDITORIA
-- ============================================================

CREATE TABLE historico_auditoria (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    data_hora   TIMESTAMPTZ NOT NULL DEFAULT now(),
    usuario_id  UUID        REFERENCES usuarios(id),
    usuario_nome VARCHAR(120),
    login       VARCHAR(50),
    acao        VARCHAR(60) NOT NULL,   -- 'Criou OS', 'Editou', 'Excluiu', etc.
    numero_ref  VARCHAR(20),
    detalhe     TEXT
);

CREATE INDEX idx_hist_data_hora  ON historico_auditoria(data_hora DESC);
CREATE INDEX idx_hist_usuario    ON historico_auditoria(usuario_id);
CREATE INDEX idx_hist_numero_ref ON historico_auditoria(numero_ref);

-- ============================================================
-- 16. CONFIGURACOES
-- ============================================================

CREATE TABLE configuracoes (
    chave           VARCHAR(60)  PRIMARY KEY,
    valor           TEXT         NOT NULL,
    descricao       TEXT,
    atualizado_em   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ============================================================
-- 17. SEQUENCIAS — controle de numeração
-- ============================================================

CREATE TABLE sequencias (
    nome    VARCHAR(30) PRIMARY KEY,   -- 'OS', 'SOL', 'PL', 'RAC'
    ultimo  INTEGER     NOT NULL DEFAULT 0
);

-- ============================================================
-- SEED: Configurações padrão
-- ============================================================

INSERT INTO configuracoes (chave, valor, descricao) VALUES
    ('horas_turno_1',       '7.1',  'Horas do 1º Turno'),
    ('horas_turno_2',       '7.1',  'Horas do 2º Turno'),
    ('horas_turno_3',       '0',    'Horas do 3º Turno'),
    ('meta_disponibilidade','91',   'Meta Disponibilidade OEE (%)'),
    ('meta_performance',    '90',   'Meta Performance OEE (%)'),
    ('meta_qualidade',      '99',   'Meta Qualidade OEE (%)');

-- Numeração: OS começa do 145 (último no DATABASE), SOL e PL do atual
INSERT INTO sequencias (nome, ultimo) VALUES
    ('OS',   145),
    ('SOL',  3),
    ('PL',   2),
    ('RAC', 0);

-- ============================================================
-- FUNÇÕES AUXILIARES
-- ============================================================

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION fn_set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Próximo número de OS/SOL/PL/RAC (transacional)
CREATE OR REPLACE FUNCTION fn_proximo_numero(p_nome VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    v_proximo INTEGER;
BEGIN
    UPDATE sequencias
    SET ultimo = ultimo + 1
    WHERE nome = p_nome
    RETURNING ultimo INTO v_proximo;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sequência não encontrada: %', p_nome;
    END IF;

    RETURN v_proximo;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================

CREATE TRIGGER trg_usuarios_updated
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION fn_set_atualizado_em();

CREATE TRIGGER trg_unidades_updated
    BEFORE UPDATE ON unidades
    FOR EACH ROW EXECUTE FUNCTION fn_set_atualizado_em();

CREATE TRIGGER trg_locais_updated
    BEFORE UPDATE ON locais
    FOR EACH ROW EXECUTE FUNCTION fn_set_atualizado_em();

CREATE TRIGGER trg_ambientes_updated
    BEFORE UPDATE ON ambientes
    FOR EACH ROW EXECUTE FUNCTION fn_set_atualizado_em();

CREATE TRIGGER trg_salas_updated
    BEFORE UPDATE ON salas
    FOR EACH ROW EXECUTE FUNCTION fn_set_atualizado_em();

CREATE TRIGGER trg_maquinas_updated
    BEFORE UPDATE ON maquinas
    FOR EACH ROW EXECUTE FUNCTION fn_set_atualizado_em();

CREATE TRIGGER trg_os_updated
    BEFORE UPDATE ON ordens_servico
    FOR EACH ROW EXECUTE FUNCTION fn_set_atualizado_em();

CREATE TRIGGER trg_planejadas_updated
    BEFORE UPDATE ON os_planejadas
    FOR EACH ROW EXECUTE FUNCTION fn_set_atualizado_em();

CREATE TRIGGER trg_racr_updated
    BEFORE UPDATE ON racr
    FOR EACH ROW EXECUTE FUNCTION fn_set_atualizado_em();

-- ============================================================
-- FIM DO SCHEMA
-- ============================================================
