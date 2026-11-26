-- V1: tabelas base do RITMO para o módulo de tarefas.
-- ATENÇÃO: depois de aplicada, esta migração não deve mais ser editada. Mudanças vão em V2, V3...
--
-- Convenções:
--   * id UUID: identificador impossível de adivinhar (ninguém "chuta" a tarefa 42 de outra pessoa).
--   * TIMESTAMPTZ: um instante exato (guardado em UTC).  DATE: um dia do calendário, sem hora.
--   * Todo dado pertence a um usuário (user_id). Apagar o usuário apaga tudo dele (ON DELETE CASCADE).

-- ───────────────────────────── usuários ─────────────────────────────

CREATE TABLE users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(254) NOT NULL,
    -- Nunca a senha em si: só o hash.
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(120) NOT NULL,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- E-mail único ignorando maiúsculas: "Ana@x.com" e "ana@x.com" são a mesma conta.
CREATE UNIQUE INDEX ux_users_email ON users (lower(email));

-- Relação 1 para 1 com users: a chave primária é o próprio user_id.
CREATE TABLE user_settings (
    user_id                UUID        PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    -- Define o que é "hoje" para o usuário.
    timezone               VARCHAR(64) NOT NULL DEFAULT 'America/Sao_Paulo',
    locale                 VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
    -- 0 = domingo, 1 = segunda.
    week_starts_on         SMALLINT    NOT NULL DEFAULT 1 CHECK (week_starts_on BETWEEN 0 AND 6),
    theme                  VARCHAR(10) NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system')),
    currency               VARCHAR(3)  NOT NULL DEFAULT 'BRL',
    daily_capacity_minutes INTEGER     NOT NULL DEFAULT 360 CHECK (daily_capacity_minutes >= 0),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────────── áreas da vida ─────────────────────────────

CREATE TABLE areas (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name        VARCHAR(60) NOT NULL,
    -- Nome de uma cor do design system e de um ícone, usados pelo front.
    color       VARCHAR(32) NOT NULL,
    icon        VARCHAR(48) NOT NULL,
    position    INTEGER     NOT NULL DEFAULT 0,
    archived_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- O mesmo usuário não repete nome de área.
    UNIQUE (user_id, name)
);

-- ───────────────────────────── quadros e colunas ─────────────────────────────

CREATE TABLE boards (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name       VARCHAR(60) NOT NULL,
    is_default BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_boards_user ON boards (user_id);
-- Índice único PARCIAL: só vale para as linhas com is_default = TRUE.
-- Resultado: cada usuário tem no máximo um quadro padrão.
CREATE UNIQUE INDEX ux_boards_one_default ON boards (user_id) WHERE is_default;

CREATE TABLE board_columns (
    id              UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID             NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    board_id        UUID             NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
    name            VARCHAR(40)      NOT NULL,
    -- O status de toda tarefa que estiver nesta coluna.
    status_category VARCHAR(20)      NOT NULL
        CHECK (status_category IN ('backlog', 'todo', 'in_progress', 'in_review', 'done')),
    position        DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT now(),
    -- Necessário para a chave estrangeira composta de tasks (ver abaixo).
    UNIQUE (id, board_id)
);

CREATE INDEX ix_board_columns_board ON board_columns (board_id, position);

-- ───────────────────────────── tarefas ─────────────────────────────

CREATE TABLE tasks (
    id               UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID             NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    board_id         UUID             NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
    column_id        UUID             NOT NULL,
    -- Apagar a área não apaga a tarefa: só tira o vínculo.
    area_id          UUID             REFERENCES areas (id) ON DELETE SET NULL,
    title            VARCHAR(200)     NOT NULL,
    description      TEXT,
    -- Cópia do status da coluna, para filtrar rápido. Quem escreve é sempre o service.
    status           VARCHAR(20)      NOT NULL DEFAULT 'todo'
        CHECK (status IN ('backlog', 'todo', 'in_progress', 'in_review', 'done')),
    priority         VARCHAR(10)      NOT NULL DEFAULT 'none'
        CHECK (priority IN ('none', 'low', 'medium', 'high', 'urgent')),
    -- Ordem dentro da coluna. Decimal permite colocar um card "entre" dois sem renumerar o resto.
    position         DOUBLE PRECISION NOT NULL DEFAULT 0,
    due_date         DATE,
    scheduled_start  TIMESTAMPTZ,
    estimate_minutes INTEGER          CHECK (estimate_minutes > 0),
    spent_minutes    INTEGER          NOT NULL DEFAULT 0 CHECK (spent_minutes >= 0),
    -- Array nativo do PostgreSQL.
    tags             TEXT[]           NOT NULL DEFAULT '{}',
    -- Regra de repetição no padrão RRULE, ex.: FREQ=WEEKLY;BYDAY=MO
    recurrence       VARCHAR(255),
    notes            TEXT,
    completed_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ      NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ      NOT NULL DEFAULT now(),
    -- Chave estrangeira COMPOSTA: a coluna precisa pertencer ao mesmo quadro da tarefa.
    FOREIGN KEY (column_id, board_id) REFERENCES board_columns (id, board_id) ON DELETE CASCADE
);

-- Índices: "atalhos" para as consultas mais comuns (listar por status, coluna, prazo, agenda).
CREATE INDEX ix_tasks_user_status    ON tasks (user_id, status);
CREATE INDEX ix_tasks_user_column    ON tasks (user_id, column_id, position);
CREATE INDEX ix_tasks_user_due_date  ON tasks (user_id, due_date);
CREATE INDEX ix_tasks_user_scheduled ON tasks (user_id, scheduled_start);

CREATE TABLE checklist_items (
    id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id  UUID         NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    title    VARCHAR(200) NOT NULL,
    done     BOOLEAN      NOT NULL DEFAULT FALSE,
    position INTEGER      NOT NULL DEFAULT 0
);

CREATE INDEX ix_checklist_items_task ON checklist_items (task_id, position);
