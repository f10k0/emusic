\set client_encoding 'UTF8'

-- migrate_video_likes.sql
-- Run this if you already ran migrate_new_tables.sql earlier
-- psql -U ruslankorshikov -d app_music -f migrate_video_likes.sql

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

CREATE TABLE IF NOT EXISTS video_comment_likes (
    user_id    INTEGER NOT NULL REFERENCES users(id)          ON DELETE CASCADE,
    comment_id INTEGER NOT NULL REFERENCES video_comments(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, comment_id)
);
