import os
import shutil
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from database import get_db
import models, schemas, auth
import dependencies

UPLOAD_DIR_AVATARS = "uploads/avatars/"

router = APIRouter(prefix="/users", tags=["users"])

DEFAULT_SETTINGS = {
    "hide_adult": False,
    "autoplay": True,
    "audio_quality": "medium",
    "theme": "dark",
    "volume_db": 0,
    "notifications_new_tracks": True,
    "notifications_events": True,
    "profile_public": True,
    "stats_public": False,
    "save_queue": False,
    "auto_clear_history": False,
    "equalizer_preset": "normal"
}


@router.post("/register", response_model=schemas.UserOut)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if len(user.password) > 72:
        raise HTTPException(status_code=400, detail="Password is too long. Maximum length is 72 characters.")

    db_user = db.query(models.User).filter(
        (models.User.username == user.username) | (models.User.email == user.email)
    ).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    hashed = auth.get_password_hash(user.password)
    new_user = models.User(
        username=user.username, email=user.email, hashed_password=hashed,
        role="user", avatar=None, settings=DEFAULT_SETTINGS.copy()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/token", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserOut)
def read_users_me(current_user: models.User = Depends(dependencies.get_current_active_user)):
    return current_user


@router.put("/me", response_model=schemas.UserOut)
def update_user(
    updated: schemas.UserCreate,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    current_user.username = updated.username
    current_user.email = updated.email
    if updated.password:
        current_user.hashed_password = auth.get_password_hash(updated.password)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    os.makedirs("uploads/avatars", exist_ok=True)
    file_extension = os.path.splitext(file.filename)[1]
    file_name = f"user_{current_user.id}_{int(datetime.utcnow().timestamp())}{file_extension}"
    full_path = os.path.join("uploads/avatars", file_name)
    with open(full_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    current_user.avatar = f"uploads/avatars/{file_name}"
    db.commit()
    return {"avatar_url": current_user.avatar}


# ── Настройки пользователя ───────────────────────────────────────────────────
@router.get("/me/settings")
def get_settings(current_user: models.User = Depends(dependencies.get_current_active_user)):
    settings = current_user.settings or {}
    # Заполняем дефолтами если каких-то ключей нет
    merged = {**DEFAULT_SETTINGS, **settings}
    return merged


@router.put("/me/settings")
def update_settings(
    settings: dict,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    existing = current_user.settings or {}
    merged = {**DEFAULT_SETTINGS, **existing, **settings}
    current_user.settings = merged
    db.commit()
    return merged


# ── Личная статистика ────────────────────────────────────────────────────────
@router.get("/me/stats")
def get_stats(
    period: str = "month",
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    days = 30 if period == "month" else 7
    since = datetime.utcnow() - timedelta(days=days)

    history = db.query(models.ListeningHistory).filter(
        models.ListeningHistory.user_id == current_user.id,
        models.ListeningHistory.listened_at >= since
    ).all()

    total_listens = len(history)

    # Топ треков
    track_counts = {}
    for h in history:
        track_counts[h.track_id] = track_counts.get(h.track_id, 0) + 1

    top_track_ids = sorted(track_counts, key=track_counts.get, reverse=True)[:10]
    top_tracks = []
    for tid in top_track_ids:
        t = db.query(models.Track).filter(models.Track.id == tid).first()
        if t:
            top_tracks.append({
                "id": t.id, "title": t.title,
                "artist_name": t.artist_name, "artist_id": t.artist_id,
                "cover": t.cover, "count": track_counts[tid]
            })

    # Топ артистов
    artist_counts = {}
    for h in history:
        t = db.query(models.Track).filter(models.Track.id == h.track_id).first()
        if t:
            artist_counts[t.artist_id] = artist_counts.get(t.artist_id, 0) + 1

    top_artist_ids = sorted(artist_counts, key=artist_counts.get, reverse=True)[:5]
    top_artists = []
    for aid in top_artist_ids:
        a = db.query(models.Artist).filter(models.Artist.id == aid).first()
        if a:
            top_artists.append({
                "id": a.id, "name": a.name, "avatar": a.avatar,
                "count": artist_counts[aid]
            })

    # По жанрам
    genre_counts = {}
    for h in history:
        t = db.query(models.Track).filter(models.Track.id == h.track_id).first()
        if t:
            for g in t.genres:
                genre_counts[g.name] = genre_counts.get(g.name, 0) + 1

    genres_stats = [{"name": k, "count": v} for k, v in
                    sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)]

    # Общее время (приблизительно, если duration хранится в секундах)
    total_seconds = 0
    for h in history:
        t = db.query(models.Track).filter(models.Track.id == h.track_id).first()
        if t and t.duration:
            total_seconds += t.duration

    return {
        "total_listens": total_listens,
        "total_seconds": total_seconds,
        "top_tracks": top_tracks,
        "top_artists": top_artists,
        "genres": genres_stats,
        "period_days": days,
    }


# ── Уведомления ──────────────────────────────────────────────────────────────
# Простая реализация: генерируем уведомления из данных БД
@router.get("/me/notifications")
def get_notifications(
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Возвращает уведомления: новые треки и мероприятия от подписок."""
    settings = current_user.settings or {}
    notify_tracks = settings.get("notifications_new_tracks", True)
    notify_events = settings.get("notifications_events", True)

    notifications = []
    fav_artists = current_user.favorite_artists or []

    for artist in fav_artists:
        # Новые треки (за последние 30 дней)
        if notify_tracks:
            from datetime import datetime, timedelta
            since = datetime.utcnow() - timedelta(days=30)
            new_tracks = db.query(models.Track).filter(
                models.Track.artist_id == artist.id,
                models.Track.is_published == True,
            ).order_by(models.Track.id.desc()).limit(3).all()
            for t in new_tracks:
                notifications.append({
                    "id": f"track_{t.id}",
                    "type": "new_track",
                    "title": f"Новый трек от {artist.name}",
                    "body": t.title,
                    "artist_id": artist.id,
                    "artist_name": artist.name,
                    "artist_avatar": artist.avatar,
                    "track_id": t.id,
                    "cover": t.cover,
                })

        # Новые мероприятия (предстоящие)
        if notify_events:
            from datetime import datetime
            now = datetime.utcnow()
            events = db.query(models.Event).filter(
                models.Event.artist_id == artist.id,
                models.Event.is_published == True,
                models.Event.date >= now,
            ).order_by(models.Event.date.asc()).limit(2).all()
            for e in events:
                notifications.append({
                    "id": f"event_{e.id}",
                    "type": "new_event",
                    "title": f"Мероприятие от {artist.name}",
                    "body": e.title,
                    "artist_id": artist.id,
                    "artist_name": artist.name,
                    "artist_avatar": artist.avatar,
                    "event_id": e.id,
                    "date": e.date,
                })

    # Сортируем — события сначала, потом треки
    notifications = notifications[:20]
    return {"notifications": notifications, "total": len(notifications)}
