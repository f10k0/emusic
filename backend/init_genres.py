import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import Genre

GENRES = [
    "Рэп", "R&B", "Рок", "Поп", "Электронная музыка",
    "Хип-хоп", "Джаз", "Блюз", "Кантри", "Регги",
    "Метал", "Панк", "Инди", "Альтернатива", "Фолк",
    "Классическая", "Эмбиент", "Лоу-фай", "Техно", "Хаус"
]

def slugify(text):
    """Простая замена slugify (без внешних библиотек)."""
    import re
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text.strip('-')

def add_genres():
    db = SessionLocal()
    for name in GENRES:
        existing = db.query(Genre).filter(Genre.name == name).first()
        if not existing:
            slug = slugify(name)
            genre = Genre(name=name, slug=slug, description=f"Популярные треки в жанре {name}")
            db.add(genre)
    db.commit()
    db.close()
    print("Жанры добавлены")

if __name__ == "__main__":
    add_genres()