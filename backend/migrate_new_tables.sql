-- Миграция: добавление новых таблиц и полей (запускать после применения существующей схемы)
-- Запуск: psql -U <user> -d <dbname> -f migrate_new_tables.sql

-- 1. Настроения (Moods)
CREATE TABLE IF NOT EXISTS moods (
    id SERIAL PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL,
    slug VARCHAR UNIQUE NOT NULL,
    emoji VARCHAR
);

-- 2. Связь треков и настроений
CREATE TABLE IF NOT EXISTS track_moods (
    track_id INTEGER REFERENCES tracks(id) ON DELETE CASCADE,
    mood_id  INTEGER REFERENCES moods(id)  ON DELETE CASCADE,
    PRIMARY KEY (track_id, mood_id)
);

-- 3. Добавить поля в треки
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS is_adult BOOLEAN DEFAULT FALSE;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS lyrics TEXT;

-- 4. Настройки пользователей (JSON-колонка)
ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB;

-- 5. Видеоклипы
CREATE TABLE IF NOT EXISTS videos (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR NOT NULL,
    description TEXT,
    file_path   VARCHAR NOT NULL,
    artist_id   INTEGER NOT NULL REFERENCES artists(id),
    duration    INTEGER,
    play_count  BIGINT DEFAULT 0,
    likes       INTEGER DEFAULT 0,
    dislikes    INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Комментарии к видео
CREATE TABLE IF NOT EXISTS video_comments (
    id        SERIAL PRIMARY KEY,
    video_id  INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id   INTEGER NOT NULL REFERENCES users(id),
    parent_id INTEGER REFERENCES video_comments(id),
    content   TEXT NOT NULL,
    likes     INTEGER DEFAULT 0,
    dislikes  INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Мероприятия
CREATE TABLE IF NOT EXISTS events (
    id           SERIAL PRIMARY KEY,
    title        VARCHAR NOT NULL,
    description  TEXT,
    date         TIMESTAMPTZ NOT NULL,
    location     VARCHAR,
    tickets_url  VARCHAR,
    image        VARCHAR,
    artist_id    INTEGER NOT NULL REFERENCES artists(id),
    is_published BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 8. История прослушиваний
CREATE TABLE IF NOT EXISTS listening_history (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    track_id    INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    listened_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_listening_history_user_time ON listening_history(user_id, listened_at DESC);
CREATE INDEX IF NOT EXISTS idx_listening_history_track ON listening_history(track_id);
CREATE INDEX IF NOT EXISTS idx_videos_artist ON videos(artist_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_artist ON events(artist_id);

-- Инициализация настроений по умолчанию
INSERT INTO moods (name, slug, emoji) VALUES
    ('Энергичный',    'energetic',  '⚡'),
    ('Грустный',      'sad',        '😢'),
    ('Романтичный',   'romantic',   '💕'),
    ('Спокойный',     'calm',       '😌'),
    ('Агрессивный',   'aggressive', '🔥'),
    ('Танцевальный',  'dance',      '🕺'),
    ('Ностальгический','nostalgic', '🌅'),
    ('Вдохновляющий', 'inspiring',  '✨')
ON CONFLICT (slug) DO NOTHING;

-- Очистка старых записей истории (старше 6 месяцев)
-- DELETE FROM listening_history WHERE listened_at < NOW() - INTERVAL '6 months';
