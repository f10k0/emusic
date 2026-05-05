import os, shutil, uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from database import get_db
from sqlalchemy import text
import models, schemas, dependencies

router = APIRouter(prefix="/videos", tags=["videos"])
UPLOAD_DIR_VIDEOS = "uploads/videos/"
os.makedirs(UPLOAD_DIR_VIDEOS, exist_ok=True)


# ── Таблицы уникальных лайков ──────────────────────────────────────────────
# Проверяем через БД напрямую (без новых моделей, используем raw SQL)
def _user_liked_video(db: Session, user_id: int, video_id: int) -> bool:
    row = db.execute(
        text("SELECT 1 FROM video_likes WHERE user_id=:u AND video_id=:v LIMIT 1"),
        {"u": user_id, "v": video_id}
    ).fetchone()
    return row is not None

def _user_disliked_video(db: Session, user_id: int, video_id: int) -> bool:
    row = db.execute(
        text("SELECT 1 FROM video_dislikes WHERE user_id=:u AND video_id=:v LIMIT 1"),
        {"u": user_id, "v": video_id}
    ).fetchone()
    return row is not None

def _user_liked_comment(db: Session, user_id: int, comment_id: int) -> bool:
    row = db.execute(
        text("SELECT 1 FROM video_comment_likes WHERE user_id=:u AND comment_id=:c LIMIT 1"),
        {"u": user_id, "c": comment_id}
    ).fetchone()
    return row is not None


# ── Вспомогательные функции ────────────────────────────────────────────────
def _video_out(v: models.Video, current_user=None, db: Session = None) -> dict:
    liked = False
    disliked = False
    if current_user and db:
        liked = _user_liked_video(db, current_user.id, v.id)
        disliked = _user_disliked_video(db, current_user.id, v.id)
    return {
        "id": v.id,
        "title": v.title,
        "description": v.description,
        "file_path": v.file_path,
        "artist_id": v.artist_id,
        "artist_name": v.artist.name if v.artist else None,
        "artist_avatar": v.artist.avatar if v.artist else None,
        "duration": v.duration,
        "play_count": v.play_count,
        "likes": v.likes,
        "dislikes": v.dislikes,
        "is_published": v.is_published,
        "created_at": v.created_at,
        "liked": liked,
        "disliked": disliked,
    }


def _comment_out(c: models.VideoComment, current_user=None, db: Session = None, depth: int = 0) -> dict:
    liked = False
    if current_user and db:
        liked = _user_liked_comment(db, current_user.id, c.id)

    # Load replies directly from DB (max 3 levels deep)
    replies = []
    if db and depth < 3:
        child_comments = (
            db.query(models.VideoComment)
            .filter(models.VideoComment.parent_id == c.id)
            .order_by(models.VideoComment.created_at.asc())
            .all()
        )
        replies = [_comment_out(r, current_user, db, depth + 1) for r in child_comments]

    return {
        "id": c.id,
        "video_id": c.video_id,
        "user_id": c.user_id,
        "parent_id": c.parent_id,
        "content": c.content,
        "likes": c.likes,
        "dislikes": c.dislikes,
        "created_at": c.created_at,
        "username": c.user.username if c.user else None,
        "user_avatar": c.user.avatar if c.user else None,
        "replies": replies,
        "liked": liked,
    }


# ── Лента видео ──────────────────────────────────────────────────────────────
@router.get("/feed")
def get_video_feed(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(dependencies.optional_current_user)
):
    from sqlalchemy import case, func as sqlfunc
    from datetime import datetime, timedelta

    all_videos = db.query(models.Video).filter(models.Video.is_published == True).all()

    if not current_user:
        # Без авторизации — просто по лайкам и дате
        all_videos.sort(key=lambda v: (-(v.likes or 0), v.created_at), reverse=False)
        page = all_videos[skip: skip + limit]
        return [_video_out(v, current_user, db) for v in page]

    # Собираем предпочтения пользователя
    fav_artist_ids = {a.id for a in (current_user.favorite_artists or [])}

    # Жанры из истории прослушиваний за последние 30 дней
    since = datetime.utcnow() - timedelta(days=30)
    history = db.query(models.ListeningHistory).filter(
        models.ListeningHistory.user_id == current_user.id,
        models.ListeningHistory.listened_at >= since
    ).all()

    liked_genre_ids = set()
    for h in history:
        track = db.query(models.Track).filter(models.Track.id == h.track_id).first()
        if track:
            for g in track.genres:
                liked_genre_ids.add(g.id)

    # Также добавляем жанры из треков любимых артистов
    for artist in (current_user.favorite_artists or []):
        for track in artist.tracks:
            for g in track.genres:
                liked_genre_ids.add(g.id)

    def score_video(v: models.Video) -> float:
        score = 0.0
        # +3 если артист в подписках
        if v.artist_id in fav_artist_ids:
            score += 3.0
        # +1 за каждый жанр артиста совпадающий с предпочтениями
        for track in v.artist.tracks if v.artist else []:
            for g in track.genres:
                if g.id in liked_genre_ids:
                    score += 0.5
                    break  # один раз за трек
        # Популярность (нормализованная)
        likes = v.likes or 0
        views = v.play_count or 0
        score += min(likes / 10.0, 5.0)   # до +5 за лайки
        score += min(views / 100.0, 2.0)  # до +2 за просмотры
        # Свежесть — за последние 7 дней +1
        if v.created_at:
            age_days = (datetime.utcnow() - v.created_at.replace(tzinfo=None)).days
            if age_days <= 7:
                score += 1.0
        return score

    scored = sorted(all_videos, key=score_video, reverse=True)
    page = scored[skip: skip + limit]
    return [_video_out(v, current_user, db) for v in page]


# ── Загрузка видео ────────────────────────────────────────────────────────────
@router.post("/upload")
async def upload_video(
    title: str = Form(...),
    description: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    if current_user.role not in ("artist", "admin"):
        raise HTTPException(403, "Только артисты могут загружать видео")
    artist = db.query(models.Artist).filter(models.Artist.user_id == current_user.id).first()
    if not artist:
        raise HTTPException(404, "Профиль артиста не найден")
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(400, "Файл слишком большой (максимум 50 МБ)")
    ext = os.path.splitext(file.filename or "video.mp4")[1].lower() or ".mp4"
    filename = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR_VIDEOS, filename)
    with open(path, "wb") as f:
        f.write(content)
    video = models.Video(
        title=title, description=description, file_path=path,
        artist_id=artist.id, is_published=True,
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    return _video_out(video, current_user, db)


# ── Лайк / дизлайк видео (уникальные) ────────────────────────────────────────
@router.post("/{video_id}/like")
def like_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    v = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not v:
        raise HTTPException(404, "Видео не найдено")

    already_liked = _user_liked_video(db, current_user.id, video_id)
    already_disliked = _user_disliked_video(db, current_user.id, video_id)

    if already_liked:
        # Убираем лайк
        db.execute(
            text("DELETE FROM video_likes WHERE user_id=:u AND video_id=:v"),
            {"u": current_user.id, "v": video_id}
        )
        v.likes = max(0, (v.likes or 0) - 1)
        liked = False
    else:
        # Ставим лайк
        db.execute(
            text("INSERT INTO video_likes (user_id, video_id) VALUES (:u, :v) ON CONFLICT DO NOTHING"),
            {"u": current_user.id, "v": video_id}
        )
        v.likes = (v.likes or 0) + 1
        liked = True
        # Убираем дизлайк если был
        if already_disliked:
            db.execute(
                text("DELETE FROM video_dislikes WHERE user_id=:u AND video_id=:v"),
                {"u": current_user.id, "v": video_id}
            )
            v.dislikes = max(0, (v.dislikes or 0) - 1)

    db.commit()
    db.refresh(v)
    return {"likes": v.likes, "dislikes": v.dislikes, "liked": liked, "disliked": False if liked else already_disliked}


@router.post("/{video_id}/dislike")
def dislike_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    v = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not v:
        raise HTTPException(404, "Видео не найдено")

    already_disliked = _user_disliked_video(db, current_user.id, video_id)
    already_liked = _user_liked_video(db, current_user.id, video_id)

    if already_disliked:
        db.execute(
            text("DELETE FROM video_dislikes WHERE user_id=:u AND video_id=:v"),
            {"u": current_user.id, "v": video_id}
        )
        v.dislikes = max(0, (v.dislikes or 0) - 1)
        disliked = False
    else:
        db.execute(
            text("INSERT INTO video_dislikes (user_id, video_id) VALUES (:u, :v) ON CONFLICT DO NOTHING"),
            {"u": current_user.id, "v": video_id}
        )
        v.dislikes = (v.dislikes or 0) + 1
        disliked = True
        if already_liked:
            db.execute(
                text("DELETE FROM video_likes WHERE user_id=:u AND video_id=:v"),
                {"u": current_user.id, "v": video_id}
            )
            v.likes = max(0, (v.likes or 0) - 1)

    db.commit()
    db.refresh(v)
    return {"likes": v.likes, "dislikes": v.dislikes, "disliked": disliked, "liked": False if disliked else already_liked}


@router.post("/{video_id}/view")
def count_view(video_id: int, db: Session = Depends(get_db)):
    v = db.query(models.Video).filter(models.Video.id == video_id).first()
    if v:
        v.play_count = (v.play_count or 0) + 1
        db.commit()
    return {"ok": True}


# ── Комментарии ───────────────────────────────────────────────────────────────
@router.get("/{video_id}/comments")
def get_comments(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(dependencies.optional_current_user)
):
    # Only top-level comments; replies loaded recursively in _comment_out
    comments = (
        db.query(models.VideoComment)
        .filter(
            models.VideoComment.video_id == video_id,
            models.VideoComment.parent_id == None
        )
        .order_by(models.VideoComment.created_at.asc())
        .all()
    )
    return [_comment_out(c, current_user, db) for c in comments]


@router.post("/{video_id}/comments")
def add_comment(
    video_id: int,
    content: str = Form(...),
    parent_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    v = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not v:
        raise HTTPException(404, "Видео не найдено")

    # Если это ответ — проверяем глубину (макс 3 уровня)
    if parent_id:
        parent = db.query(models.VideoComment).filter(models.VideoComment.id == parent_id).first()
        if not parent:
            raise HTTPException(404, "Родительский комментарий не найден")

    c = models.VideoComment(
        video_id=video_id,
        user_id=current_user.id,
        parent_id=parent_id,
        content=content,
    )
    db.add(c)
    db.commit()
    db.refresh(c)

    # Перечитываем чтобы подгрузить user relationship
    c = db.query(models.VideoComment).filter(models.VideoComment.id == c.id).first()
    return _comment_out(c, current_user, db)


# ── Лайк комментария (уникальный) ─────────────────────────────────────────────
@router.post("/comments/{comment_id}/like")
def like_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    c = db.query(models.VideoComment).filter(models.VideoComment.id == comment_id).first()
    if not c:
        raise HTTPException(404)

    already = _user_liked_comment(db, current_user.id, comment_id)
    if already:
        db.execute(
            text("DELETE FROM video_comment_likes WHERE user_id=:u AND comment_id=:c"),
            {"u": current_user.id, "c": comment_id}
        )
        c.likes = max(0, (c.likes or 0) - 1)
        liked = False
    else:
        db.execute(
            text("INSERT INTO video_comment_likes (user_id, comment_id) VALUES (:u, :c) ON CONFLICT DO NOTHING"),
            {"u": current_user.id, "c": comment_id}
        )
        c.likes = (c.likes or 0) + 1
        liked = True

    db.commit()
    return {"likes": c.likes, "liked": liked}


# ── Удаление комментария (свой или admin) ──────────────────────────────────────
def _delete_comment_recursive(comment_id: int, db: Session):
    """Рекурсивно удаляет комментарий и все его ответы вместе с лайками."""
    children = db.query(models.VideoComment).filter(
        models.VideoComment.parent_id == comment_id
    ).all()
    for child in children:
        _delete_comment_recursive(child.id, db)
    db.execute(text("DELETE FROM video_comment_likes WHERE comment_id=:c"), {"c": comment_id})
    db.query(models.VideoComment).filter(models.VideoComment.id == comment_id).delete()


@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    c = db.query(models.VideoComment).filter(models.VideoComment.id == comment_id).first()
    if not c:
        raise HTTPException(404)
    if current_user.role != "admin" and c.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    _delete_comment_recursive(comment_id, db)
    db.commit()
    return {"ok": True}


# ── Модерация ─────────────────────────────────────────────────────────────────
@router.delete("/{video_id}")
def delete_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    v = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not v:
        raise HTTPException(404)
    artist = db.query(models.Artist).filter(models.Artist.user_id == current_user.id).first()
    if current_user.role != "admin" and (not artist or artist.id != v.artist_id):
        raise HTTPException(403)
    db.delete(v)
    db.commit()
    return {"ok": True}


@router.patch("/{video_id}/hide")
def hide_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    v = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not v:
        raise HTTPException(404)
    artist = db.query(models.Artist).filter(models.Artist.user_id == current_user.id).first()
    if current_user.role != "admin" and (not artist or artist.id != v.artist_id):
        raise HTTPException(403)
    v.is_published = False
    db.commit()
    return {"ok": True}


@router.patch("/{video_id}/edit")
async def edit_video(
    video_id: int,
    title: str = Form(...),
    description: str = Form(""),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    v = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not v:
        raise HTTPException(404, "Видео не найдено")
    artist = db.query(models.Artist).filter(models.Artist.user_id == current_user.id).first()
    if current_user.role != "admin" and (not artist or artist.id != v.artist_id):
        raise HTTPException(403, "Нет доступа")
    v.title = title
    v.description = description
    db.commit()
    db.refresh(v)
    return _video_out(v, current_user, db)


@router.patch("/{video_id}/publish")
def publish_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    v = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not v:
        raise HTTPException(404)
    artist = db.query(models.Artist).filter(models.Artist.user_id == current_user.id).first()
    if current_user.role != "admin" and (not artist or artist.id != v.artist_id):
        raise HTTPException(403)
    v.is_published = True
    db.commit()
    return {"ok": True}


@router.get("/artist/{artist_id}")
def get_artist_videos(
    artist_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(dependencies.optional_current_user)
):
    q = db.query(models.Video).filter(
        models.Video.artist_id == artist_id,
        models.Video.is_published == True
    ).order_by(models.Video.created_at.desc()).offset(skip).limit(limit)
    return [_video_out(v, current_user, db) for v in q.all()]


@router.get("/admin/all")
def get_all_videos_admin(
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    """Все видео для администратора включая скрытые."""
    if current_user.role != "admin":
        raise HTTPException(403, "Только для администраторов")
    videos = db.query(models.Video).order_by(models.Video.created_at.desc()).offset(skip).limit(limit).all()
    return [_video_out(v, current_user, db) for v in videos]


@router.get("/my")
def get_my_videos(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    """Все клипы текущего артиста включая скрытые."""
    artist = db.query(models.Artist).filter(models.Artist.user_id == current_user.id).first()
    if not artist:
        raise HTTPException(404, "Профиль артиста не найден")
    videos = db.query(models.Video).filter(
        models.Video.artist_id == artist.id
    ).order_by(models.Video.created_at.desc()).all()
    return [_video_out(v, current_user, db) for v in videos]
