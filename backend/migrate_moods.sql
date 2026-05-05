-- Инициализация настроений (UTF-8 без BOM)
INSERT INTO moods (name, slug, emoji) VALUES
    ('Energichnyy',    'energetic',  E'\u26A1'),
    ('Grustnyy',       'sad',        E'\U0001F622'),
    ('Romantichnyy',   'romantic',   E'\U0001F495'),
    ('Spokoynyy',      'calm',       E'\U0001F60C'),
    ('Agressivnyy',    'aggressive', E'\U0001F525'),
    ('Tantsivalnyy',   'dance',      E'\U0001F57A'),
    ('Nostalgicheskiy','nostalgic',  E'\U0001F305'),
    ('Vdokhnovlyayushchiy','inspiring',E'\u2728')
ON CONFLICT (slug) DO NOTHING;
