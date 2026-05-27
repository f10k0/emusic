#!/usr/bin/env python3
"""
run_migration.py
Creates all missing gamification tables and seeds default data.

USAGE (from the backend folder):
    python run_migration.py

If you get "module not found" errors, run with the venv python:
    venv\Scripts\python.exe run_migration.py    (Windows)
    venv/bin/python run_migration.py            (Linux/Mac)
"""

# ── DB connection ── edit if your credentials differ ─────────────
DB_URL = "postgresql://ruslankorshikov:1234@localhost/app_music"
# ─────────────────────────────────────────────────────────────────

import sys

try:
    import psycopg2
except ImportError:
    print("ERROR: psycopg2 not found.")
    print("Run:  pip install psycopg2-binary  (or use venv\\Scripts\\python run_migration.py)")
    sys.exit(1)

from urllib.parse import urlparse

u = urlparse(DB_URL)
conn_params = dict(
    host=u.hostname,
    port=u.port or 5432,
    dbname=u.path.lstrip('/'),
    user=u.username,
    password=u.password,
)

MIGRATION_SQL = [
    # ── user_progress ─────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS user_progress (
        id                    SERIAL PRIMARY KEY,
        user_id               INTEGER NOT NULL UNIQUE
                                  REFERENCES users(id) ON DELETE CASCADE,
        level                 INTEGER     NOT NULL DEFAULT 1,
        ecoins                INTEGER     NOT NULL DEFAULT 0,
        total_listen_seconds  INTEGER     NOT NULL DEFAULT 0,
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id)",

    # ── shop_items ────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS shop_items (
        id           SERIAL PRIMARY KEY,
        name         VARCHAR NOT NULL,
        description  TEXT,
        item_type    VARCHAR NOT NULL,
        value        VARCHAR NOT NULL,
        price        INTEGER NOT NULL,
        rarity       VARCHAR NOT NULL DEFAULT 'common',
        unlock_level INTEGER NOT NULL DEFAULT 0,
        preview_css  TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,

    # ── user_inventory ────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS user_inventory (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
        item_id     INTEGER NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
        acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_equipped BOOLEAN     NOT NULL DEFAULT FALSE
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_inventory_user ON user_inventory(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_inventory_item ON user_inventory(item_id)",

    # ── quests ────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS quests (
        id           SERIAL PRIMARY KEY,
        title        VARCHAR NOT NULL,
        description  TEXT    NOT NULL,
        quest_type   VARCHAR NOT NULL,
        target_value INTEGER NOT NULL DEFAULT 1,
        target_ref   VARCHAR,
        ecoin_reward INTEGER NOT NULL DEFAULT 10,
        difficulty   VARCHAR NOT NULL DEFAULT 'easy'
    )
    """,

    # ── user_daily_quests ─────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS user_daily_quests (
        id        SERIAL PRIMARY KEY,
        user_id   INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
        quest_id  INTEGER NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
        date      VARCHAR NOT NULL,
        progress  INTEGER NOT NULL DEFAULT 0,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        claimed   BOOLEAN NOT NULL DEFAULT FALSE
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_daily_quests_user ON user_daily_quests(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_daily_quests_date ON user_daily_quests(user_id, date)",

    # ── user_achievements ─────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS user_achievements (
        id              SERIAL PRIMARY KEY,
        user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_key VARCHAR NOT NULL,
        achieved_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_id)",
    """
    CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_unique
        ON user_achievements(user_id, achievement_key)
    """,
]

SHOP_ITEMS = [
    ("Золотая рамка",         "Элегантная золотая рамка для аватара",           "avatar_frame",   "frame-gold",       300, "legendary", 0),
    ("Неоновая рамка",        "Яркая неоновая рамка в стиле киберпанк",         "avatar_frame",   "frame-neon",       150, "epic",      0),
    ("Серебряная рамка",      "Классическая серебряная рамка",                  "avatar_frame",   "frame-silver",      80, "rare",      0),
    ("Огненная рамка",        "Рамка с эффектом горящего пламени",              "avatar_frame",   "frame-fire",       200, "epic",      5),
    ("Золотой ник",           "Ваш никнейм будет сиять золотом",                "nickname_color", "nick-gold",        120, "epic",      0),
    ("Неоновый ник",          "Ярко-голубой цвет ника в стиле киберпанк",       "nickname_color", "nick-neon",         90, "rare",      0),
    ("Радужный ник",          "Ник переливается всеми цветами радуги",          "nickname_color", "nick-rainbow",     250, "legendary", 10),
    ("Фон: Галактика",        "Космический фон с галактикой и звёздами",        "bg",             "bg-galaxy",        180, "epic",      0),
    ("Фон: Неон-сити",        "Городской ночной пейзаж в неоновых огнях",       "bg",             "bg-neoncity",      160, "epic",      0),
    ("Фон: Лес",              "Спокойный лес с лучами солнца",                  "bg",             "bg-forest",         70, "common",    0),
    ("Фон: Океан",            "Бесконечный океан на закате",                    "bg",             "bg-ocean",          70, "common",    0),
    ("Тема: Глубокий космос", "Тёмная тема с космическими акцентами",           "theme",          "theme-space",      400, "legendary", 20),
    ("Тема: Розовый закат",   "Тёплая розово-фиолетовая тема",                  "theme",          "theme-sunset",     350, "legendary", 15),
    ("Значок: Меломан",       "Для тех, кто слушает музыку часами",             "badge",          "badge-audiophile",  50, "common",    0),
    ("Значок: Первооткрыватель","Ищешь новую музыку каждый день",               "badge",          "badge-explorer",   100, "rare",      0),
]

QUESTS = [
    # (title, description, quest_type, target_value, ecoin_reward, difficulty)
    ("Первый трек",          "Прослушай 1 трек",                         "listen_tracks",    1,   10, "easy"),
    ("Музыкальное утро",     "Прослушай 3 трека",                        "listen_tracks",    3,   15, "easy"),
    ("5 минут музыки",       "Прослушай музыку 5 минут",                 "listen_minutes",   5,   10, "easy"),
    ("Четверть часа",        "Прослушай музыку 15 минут",                "listen_minutes",  15,   15, "easy"),
    ("Поставь лайк",         "Лайкни 1 трек",                           "like_tracks",      1,   10, "easy"),
    ("3 лайка",              "Лайкни 3 трека",                           "like_tracks",      3,   15, "easy"),
    ("Создай плейлист",      "Создай 1 плейлист",                        "add_playlist",     1,   20, "easy"),
    ("Первые 5 треков",      "Прослушай 5 треков",                       "listen_tracks",    5,   15, "easy"),
    ("Полчаса музыки",       "Прослушай музыку 30 минут",                "listen_minutes",  30,   20, "easy"),
    ("10 треков",            "Прослушай 10 треков за день",              "listen_tracks",   10,   20, "easy"),
    ("Час музыки",           "Прослушай музыку 1 час",                   "listen_minutes",  60,   30, "medium"),
    ("Меломан дня",          "Прослушай 20 треков",                      "listen_tracks",   20,   35, "medium"),
    ("5 лайков",             "Лайкни 5 треков",                          "like_tracks",      5,   25, "medium"),
    ("10 лайков",            "Лайкни 10 треков",                         "like_tracks",     10,   35, "medium"),
    ("Два плейлиста",        "Создай 2 плейлиста",                       "add_playlist",     2,   40, "medium"),
    ("Полтора часа",         "Прослушай музыку 90 минут",                "listen_minutes",  90,   40, "medium"),
    ("30 треков",            "Прослушай 30 треков",                      "listen_tracks",   30,   45, "medium"),
    ("2 часа музыки",        "Прослушай музыку 2 часа",                  "listen_minutes", 120,   45, "medium"),
    ("Плейлист на 5 треков", "Добавь 5 треков в любой плейлист",         "playlist_tracks",  5,   30, "medium"),
    ("Коллекционер",         "Поставь 15 лайков",                        "like_tracks",     15,   45, "medium"),
    ("Три плейлиста",        "Создай 3 плейлиста",                       "add_playlist",     3,   50, "medium"),
    ("3 часа музыки",        "Прослушай музыку 3 часа",                  "listen_minutes", 180,   50, "medium"),
    ("40 треков",            "Прослушай 40 треков",                      "listen_tracks",   40,   50, "medium"),
    ("Плейлист на 10",       "Добавь 10 треков в плейлист",              "playlist_tracks", 10,   45, "medium"),
    ("Любитель музыки",      "Прослушай 25 разных треков",               "listen_tracks",   25,   40, "medium"),
    ("Рок-фанат",            "Прослушай 5 треков в жанре Rock",          "listen_genre",     5,   60, "hard"),
    ("Поп-слушатель",        "Прослушай 5 треков в жанре Pop",           "listen_genre",     5,   60, "hard"),
    ("Электронщик",          "Прослушай 5 треков Electronic",            "listen_genre",     5,   60, "hard"),
    ("Хип-хоп культура",     "Прослушай 5 треков Hip-Hop",               "listen_genre",     5,   60, "hard"),
    ("Джазмен",              "Прослушай 5 джазовых треков",              "listen_genre",     5,   60, "hard"),
    ("4 часа музыки",        "Прослушай музыку 4 часа",                  "listen_minutes", 240,   70, "hard"),
    ("50 треков",            "Прослушай 50 треков",                      "listen_tracks",   50,   75, "hard"),
    ("Суперколлекционер",    "Поставь 25 лайков",                        "like_tracks",     25,   70, "hard"),
    ("5 плейлистов",         "Создай 5 плейлистов",                      "add_playlist",     5,   80, "hard"),
    ("Плейлист на 20",       "Добавь 20 треков в плейлист",              "playlist_tracks", 20,   75, "hard"),
    ("5 жанров",             "Прослушай треки в 5 разных жанрах",        "listen_genres",    5,   80, "hard"),
    ("6 часов музыки",       "Прослушай музыку 6 часов",                 "listen_minutes", 360,   90, "hard"),
    ("75 треков",            "Прослушай 75 треков",                      "listen_tracks",   75,   90, "hard"),
    ("30 лайков",            "Поставь 30 лайков",                        "like_tracks",     30,   85, "hard"),
    ("Меломан недели",       "Прослушай 100 треков",                     "listen_tracks",  100,  100, "hard"),
    ("8 часов музыки",       "Прослушай музыку 8 часов",                 "listen_minutes", 480,  100, "hard"),
    ("Плейлист на 30",       "Добавь 30 треков в один плейлист",         "playlist_tracks", 30,   95, "hard"),
    ("50 лайков",            "Поставь 50 лайков",                        "like_tracks",     50,  110, "hard"),
    ("Все жанры",            "Треки во всех доступных жанрах",           "listen_all_genres", 8, 120, "hard"),
    ("Покупатель",           "Купи 1 предмет в магазине",                "buy_items",        1,   60, "hard"),
    ("Коллекционер магазина","Купи 3 предмета в магазине",               "buy_items",        3,  100, "hard"),
    ("10 часов музыки",      "Прослушай музыку 10 часов суммарно",       "listen_minutes", 600,  120, "hard"),
    ("125 треков",           "Прослушай 125 треков",                     "listen_tracks",  125,  115, "hard"),
    ("Легенда дня",          "Прослушай 50 треков за один день",         "listen_tracks",   50,  120, "hard"),
    ("12 часов музыки",      "Прослушай музыку 12 часов суммарно",       "listen_minutes", 720,  120, "hard"),
]


def run():
    print("=" * 55)
    print("  eMusic — Gamification Migration")
    print("=" * 55)
    print(f"\nDB: {conn_params['dbname']} @ {conn_params['host']}\n")

    try:
        conn = psycopg2.connect(**conn_params)
        conn.autocommit = True
        cur = conn.cursor()
    except Exception as e:
        print(f"ERROR: Cannot connect to database.\n  {e}")
        print("\nCheck DB_URL at the top of this file.")
        sys.exit(1)

    # Step 1: Create tables
    print("[1/3] Creating missing tables...")
    ok = 0
    for sql in MIGRATION_SQL:
        try:
            cur.execute(sql)
            ok += 1
        except Exception as e:
            print(f"  WARNING: {e}")
    print(f"  Done ({ok}/{len(MIGRATION_SQL)} statements OK).")

    # Step 2: Seed shop items
    print("\n[2/3] Seeding shop items...")
    cur.execute("SELECT COUNT(*) FROM shop_items")
    count = cur.fetchone()[0]
    if count == 0:
        for item in SHOP_ITEMS:
            cur.execute(
                "INSERT INTO shop_items (name, description, item_type, value, price, rarity, unlock_level) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                item
            )
        cur.execute("SELECT COUNT(*) FROM shop_items")
        print(f"  {cur.fetchone()[0]} shop items created.")
    else:
        print(f"  Already has {count} items — skipped.")

    # Step 3: Seed quests
    print("\n[3/3] Seeding quests...")
    cur.execute("SELECT COUNT(*) FROM quests")
    count = cur.fetchone()[0]
    if count == 0:
        for q in QUESTS:
            cur.execute(
                "INSERT INTO quests (title, description, quest_type, target_value, ecoin_reward, difficulty) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                q
            )
        cur.execute("SELECT COUNT(*) FROM quests")
        print(f"  {cur.fetchone()[0]} quests created.")
    else:
        print(f"  Already has {count} quests — skipped.")

    cur.close()
    conn.close()

    print("\n" + "=" * 55)
    print("  Migration complete!")
    print("=" * 55)
    print("\nNext steps:")
    print("  1. Restart your FastAPI backend")
    print("  2. Open the app — quests and shop will work now")


if __name__ == '__main__':
    run()
