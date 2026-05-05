from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
import models, dependencies

router = APIRouter(prefix="/moods", tags=["moods"])

DEFAULT_MOODS = [
    {"name": "Энергичный", "slug": "energetic", "emoji": "⚡"},
    {"name": "Грустный", "slug": "sad", "emoji": "😢"},
    {"name": "Романтичный", "slug": "romantic", "emoji": "💕"},
    {"name": "Спокойный", "slug": "calm", "emoji": "😌"},
    {"name": "Агрессивный", "slug": "aggressive", "emoji": "🔥"},
    {"name": "Танцевальный", "slug": "dance", "emoji": "🕺"},
    {"name": "Ностальгический", "slug": "nostalgic", "emoji": "🌅"},
    {"name": "Вдохновляющий", "slug": "inspiring", "emoji": "✨"},
]


def _mood_out(m: models.Mood) -> dict:
    return {"id": m.id, "name": m.name, "slug": m.slug, "emoji": m.emoji}


@router.get("/")
def get_moods(db: Session = Depends(get_db)):
    moods = db.query(models.Mood).all()
    if not moods:
        # Автоинициализация
        for md in DEFAULT_MOODS:
            db.add(models.Mood(**md))
        db.commit()
        moods = db.query(models.Mood).all()
    return [_mood_out(m) for m in moods]


@router.get("/{slug}/tracks")
def get_tracks_by_mood(
    slug: str,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(dependencies.optional_current_user)
):
    mood = db.query(models.Mood).filter(models.Mood.slug == slug).first()
    if not mood:
        raise HTTPException(404, "Настроение не найдено")

    settings = (current_user.settings or {}) if current_user else {}
    hide_adult = settings.get("hide_adult", True)

    tracks = mood.tracks
    if hide_adult:
        tracks = [t for t in tracks if not t.is_adult]
    tracks = [t for t in tracks if t.is_published]
    tracks = tracks[skip: skip + limit]

    result = []
    for t in tracks:
        result.append({
            "id": t.id, "title": t.title, "duration": t.duration,
            "artist_id": t.artist_id, "artist_name": t.artist_name,
            "cover": t.cover, "play_count": t.play_count, "is_adult": t.is_adult,
            "liked": current_user and (t in current_user.favorite_tracks) if current_user else False,
            "moods": [{"id": m.id, "name": m.name, "slug": m.slug, "emoji": m.emoji} for m in t.moods],
        })
    return result
