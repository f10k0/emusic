\set client_encoding 'UTF8'

-- ================================================================
-- setup_db.sql  eMusic v2  (UTF-8, pure ASCII comments)
-- Safe to run multiple times: IF NOT EXISTS / ON CONFLICT DO NOTHING
-- Usage:
--   psql -U ruslankorshikov -d app_music -f setup_db.sql
-- ================================================================

-- 1. Moods table (stores FA icon class in emoji column)
CREATE TABLE IF NOT EXISTS moods (
    id    SERIAL PRIMARY KEY,
    name  VARCHAR UNIQUE NOT NULL,
    slug  VARCHAR UNIQUE NOT NULL,
    emoji VARCHAR
);

-- 2. Track <-> Mood many-to-many
CREATE TABLE IF NOT EXISTS track_moods (
    track_id INTEGER REFERENCES tracks(id)  ON DELETE CASCADE,
    mood_id  INTEGER REFERENCES moods(id)   ON DELETE CASCADE,
    PRIMARY KEY (track_id, mood_id)
);

-- 3. New columns on tracks
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS is_adult    BOOLEAN DEFAULT FALSE;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS lyrics      TEXT;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT NOW();

-- 4. User settings (JSON)
ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB;

-- 5. Video clips
CREATE TABLE IF NOT EXISTS videos (
    id           SERIAL PRIMARY KEY,
    title        VARCHAR     NOT NULL,
    description  TEXT,
    file_path    VARCHAR     NOT NULL,
    artist_id    INTEGER     NOT NULL REFERENCES artists(id),
    duration     INTEGER,
    play_count   BIGINT      DEFAULT 0,
    likes        INTEGER     DEFAULT 0,
    dislikes     INTEGER     DEFAULT 0,
    is_published BOOLEAN     DEFAULT TRUE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Video comments (parent_id cascades on delete so replies are auto-removed)
CREATE TABLE IF NOT EXISTS video_comments (
    id         SERIAL PRIMARY KEY,
    video_id   INTEGER NOT NULL REFERENCES videos(id)         ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    parent_id  INTEGER          REFERENCES video_comments(id) ON DELETE CASCADE,
    content    TEXT    NOT NULL,
    likes      INTEGER DEFAULT 0,
    dislikes   INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Unique video likes / dislikes (one per user per video)
CREATE TABLE IF NOT EXISTS video_likes (
    user_id  INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, video_id)
);

CREATE TABLE IF NOT EXISTS video_dislikes (
    user_id  INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, video_id)
);

-- 8. Unique comment likes
CREATE TABLE IF NOT EXISTS video_comment_likes (
    user_id    INTEGER NOT NULL REFERENCES users(id)          ON DELETE CASCADE,
    comment_id INTEGER NOT NULL REFERENCES video_comments(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, comment_id)
);

-- 9. Events (concerts, releases, etc.)
CREATE TABLE IF NOT EXISTS events (
    id           SERIAL PRIMARY KEY,
    title        VARCHAR     NOT NULL,
    description  TEXT,
    date         TIMESTAMPTZ NOT NULL,
    location     VARCHAR,
    tickets_url  VARCHAR,
    image        VARCHAR,
    artist_id    INTEGER     NOT NULL REFERENCES artists(id),
    is_published BOOLEAN     DEFAULT TRUE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Listening history
CREATE TABLE IF NOT EXISTS listening_history (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    track_id    INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    listened_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Fix video_comments.parent_id FK: add ON DELETE CASCADE
--     (needed if table was created without it in a previous migration)
ALTER TABLE video_comments
    DROP CONSTRAINT IF EXISTS video_comments_parent_id_fkey;
ALTER TABLE video_comments
    ADD CONSTRAINT video_comments_parent_id_fkey
    FOREIGN KEY (parent_id) REFERENCES video_comments(id) ON DELETE CASCADE;

-- 12. Fix video_comment_likes FK: cascade when comment deleted
ALTER TABLE video_comment_likes
    DROP CONSTRAINT IF EXISTS video_comment_likes_comment_id_fkey;
ALTER TABLE video_comment_likes
    ADD CONSTRAINT video_comment_likes_comment_id_fkey
    FOREIGN KEY (comment_id) REFERENCES video_comments(id) ON DELETE CASCADE;

-- 13. Performance indexes
CREATE INDEX IF NOT EXISTS idx_listening_user_time ON listening_history(user_id, listened_at DESC);
CREATE INDEX IF NOT EXISTS idx_listening_track     ON listening_history(track_id);
CREATE INDEX IF NOT EXISTS idx_videos_artist       ON videos(artist_id);
CREATE INDEX IF NOT EXISTS idx_events_date         ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_artist       ON events(artist_id);
CREATE INDEX IF NOT EXISTS idx_comments_video      ON video_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent     ON video_comments(parent_id);

-- 14. Seed moods (Cyrillic via Unicode escapes, FA icon class stored in emoji column)
INSERT INTO moods (name, slug, emoji) VALUES
    (U&'\042D\043D\0435\0440\0433\0438\0447\043D\044B\0439',         'energetic',  'fa-bolt'),
    (U&'\0413\0440\0443\0441\0442\043D\044B\0439',                     'sad',        'fa-cloud-rain'),
    (U&'\0420\043E\043C\0430\043D\0442\0438\0447\043D\044B\0439',   'romantic',   'fa-heart'),
    (U&'\0421\043F\043E\043A\043E\0439\043D\044B\0439',               'calm',       'fa-leaf'),
    (U&'\0410\0433\0440\0435\0441\0441\0438\0432\043D\044B\0439',   'aggressive', 'fa-fire'),
    (U&'\0422\0430\043D\0446\0435\0432\0430\043B\044C\043D\044B\0439','dance',   'fa-music'),
    (U&'\041D\043E\0441\0442\0430\043B\044C\0433\0438\0447\0435\0441\043A\0438\0439','nostalgic','fa-clock'),
    (U&'\0412\0434\043E\0445\043D\043E\0432\043B\044F\044E\0449\0438\0439','inspiring','fa-star')
ON CONFLICT (slug) DO NOTHING;

-- 15. hidden_by_admin flag on videos (artist cannot un-hide admin-moderated videos)
ALTER TABLE videos ADD COLUMN IF NOT EXISTS hidden_by_admin BOOLEAN DEFAULT FALSE;
