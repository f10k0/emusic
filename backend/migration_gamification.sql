-- ================================================================
-- migration_gamification.sql
-- Adds all gamification tables that were missing from the DB.
-- Safe to run multiple times (IF NOT EXISTS everywhere).
--
-- Run with:
--   psql -U <your_user> -d <your_db> -f migration_gamification.sql
-- ================================================================

SET client_encoding = 'UTF8';

-- ── 1. user_progress ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_progress (
    id                    SERIAL PRIMARY KEY,
    user_id               INTEGER NOT NULL UNIQUE
                              REFERENCES users(id) ON DELETE CASCADE,
    level                 INTEGER     NOT NULL DEFAULT 1,
    ecoins                INTEGER     NOT NULL DEFAULT 0,
    total_listen_seconds  INTEGER     NOT NULL DEFAULT 0,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);

-- ── 2. shop_items ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_items (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR NOT NULL,
    description  TEXT,
    item_type    VARCHAR NOT NULL,   -- avatar_frame | bg | theme | nickname_color | badge
    value        VARCHAR NOT NULL,   -- CSS class, color key, theme key, etc.
    price        INTEGER NOT NULL,   -- in Ecoins
    rarity       VARCHAR NOT NULL DEFAULT 'common',  -- common | rare | epic | legendary
    unlock_level INTEGER NOT NULL DEFAULT 0,
    preview_css  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. user_inventory ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_inventory (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    item_id     INTEGER NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_equipped BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_inventory_user   ON user_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item   ON user_inventory(item_id);

-- ── 4. quests ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quests (
    id           SERIAL PRIMARY KEY,
    title        VARCHAR NOT NULL,
    description  TEXT    NOT NULL,
    quest_type   VARCHAR NOT NULL,
    target_value INTEGER NOT NULL DEFAULT 1,
    target_ref   VARCHAR,
    ecoin_reward INTEGER NOT NULL DEFAULT 10,
    difficulty   VARCHAR NOT NULL DEFAULT 'easy'  -- easy | medium | hard
);

-- ── 5. user_daily_quests ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_daily_quests (
    id        SERIAL PRIMARY KEY,
    user_id   INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    quest_id  INTEGER NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    date      VARCHAR NOT NULL,  -- YYYY-MM-DD
    progress  INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    claimed   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_daily_quests_user ON user_daily_quests(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_quests_date ON user_daily_quests(user_id, date);

-- ── 6. user_achievements ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_achievements (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_key VARCHAR NOT NULL,
    achieved_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_unique
    ON user_achievements(user_id, achievement_key);

-- ── Done ──────────────────────────────────────────────────────
DO $$
BEGIN
    RAISE NOTICE 'Gamification migration complete.';
    RAISE NOTICE 'Tables created (if not existed): user_progress, shop_items, user_inventory, quests, user_daily_quests, user_achievements';
    RAISE NOTICE 'Next step: restart the FastAPI backend, then POST /gamification/admin/seed to populate shop items and quests.';
END$$;
