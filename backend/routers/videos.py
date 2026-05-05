import os, shutil, uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from database import get_db
import models, schemas, dependencies

router = APIRouter(prefix="/videos", tags=["videos"])
UPLOAD_DIR_VIDEOS = "uploads/videos/"
os.makedirs(UPLOAD_DIR_VIDEOS, exist_ok=True)


def _video_out(v: models.Video, current_user=None) -> dict:
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
    }


def _comment_out(c: models.VideoComment) -> dict:
    replies = []
    if c.replies:
        for r in c.replies:
            if r.parent_id == c.id:
                replies.append(_comment_out(r))
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
    }


# ── Лента видео ─────────────────────────────────────────────────────────────
@router.get("/feed")
def get_video_feed(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(dependencies.optional_current_user)
):
    query = db.query(models.Video).filter(models.Video.is_published == True)

    # Персонализация: предпочитаем артистов, на которых подписан пользователь
    if current_user and current_user.favorite_artists:
        fav_ids = [a.id for a in current_user.favorite_artists]
        from sqlalchemy import case
        query = query.order_by(
            case((models.Video.artist_id.in_(fav_ids), 0), else_=1),
            models.Video.likes.desc(),
            models.Video.created_at.desc()
        )
    else:
        query = query.order_by(models.Video.likes.desc(), models.Video.created_at.desc())

    videos = query.offset(skip).limit(limit).all()
    return [_video_out(v, current_user) for v in videos]


# ── Загрузка видео ───────────────────────────────────────────────────────────
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

    # Проверяем размер (50 MB)
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(400, "Файл слишком большой (максимум 50 МБ)")

    ext = os.path.splitext(file.filename or "video.mp4")[1].lower() or ".mp4"
    filename = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR_VIDEOS, filename)
    with open(path, "wb") as f:
        f.write(content)

    video = models.Video(
        title=title,
        description=description,
        file_path=path,
        artist_id=artist.id,
        is_published=True,
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    return _video_out(video, current_user)


# ── Лайк / дизлайк видео ────────────────────────────────────────────────────
@router.post("/{video_id}/like")
def like_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    v = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not v:
        raise HTTPException(404, "Видео не найдено")
    v.likes = (v.likes or 0) + 1
    db.commit()
    return {"likes": v.likes}


@router.post("/{video_id}/dislike")
def dislike_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    v = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not v:
        raise HTTPException(404, "Видео не найдено")
    v.dislikes = (v.dislikes or 0) + 1
    db.commit()
    return {"dislikes": v.dislikes}


@router.post("/{video_id}/view")
def count_view(video_id: int, db: Session = Depends(get_db)):
    v = db.query(models.Video).filter(models.Video.id == video_id).first()
    if v:
        v.play_count = (v.play_count or 0) + 1
        db.commit()
    return {"ok": True}


# ── Комментарии ──────────────────────────────────────────────────────────────
@router.get("/{video_id}/comments")
def get_comments(video_id: int, db: Session = Depends(get_db)):
    comments = db.query(models.VideoComment).filter(
        models.VideoComment.video_id == video_id,
        models.VideoComment.parent_id == None
    ).order_by(models.VideoComment.created_at.asc()).all()
    return [_comment_out(c) for c in comments]


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
    c = models.VideoComment(
        video_id=video_id,
        user_id=current_user.id,
        parent_id=parent_id,
        content=content,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return _comment_out(c)


@router.post("/comments/{comment_id}/like")
def like_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    c = db.query(models.VideoComment).filter(models.VideoComment.id == comment_id).first()
    if not c:
        raise HTTPException(404)
    c.likes = (c.likes or 0) + 1
    db.commit()
    return {"likes": c.likes}


@router.post("/comments/{comment_id}/dislike")
def dislike_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    c = db.query(models.VideoComment).filter(models.VideoComment.id == comment_id).first()
    if not c:
        raise HTTPException(404)
    c.dislikes = (c.dislikes or 0) + 1
    db.commit()
    return {"dislikes": c.dislikes}


# ── Админ: скрыть / удалить ──────────────────────────────────────────────────
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
    if current_user.role != "admin":
        raise HTTPException(403)
    v = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not v:
        raise HTTPException(404)
    v.is_published = False
    db.commit()
    return {"ok": True}


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
        raise HTTPException(403)
    db.delete(c)
    db.commit()
    return {"ok": True}


# ── Редактирование клипа артистом ────────────────────────────────────────────
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
    return _video_out(v, current_user)


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
    """Публичные клипы артиста — для отображения в профиле."""
    q = db.query(models.Video).filter(
        models.Video.artist_id == artist_id,
        models.Video.is_published == True
    ).order_by(models.Video.created_at.desc()).offset(skip).limit(limit)
    return [_video_out(v, current_user) for v in q.all()]
