import os, shutil, uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from database import get_db
import models, dependencies

router = APIRouter(prefix="/events", tags=["events"])
UPLOAD_DIR_EVENTS = "uploads/events/"
os.makedirs(UPLOAD_DIR_EVENTS, exist_ok=True)


def _event_out(e: models.Event) -> dict:
    return {
        "id": e.id,
        "title": e.title,
        "description": e.description,
        "date": e.date,
        "location": e.location,
        "tickets_url": e.tickets_url,
        "image": e.image,
        "artist_id": e.artist_id,
        "artist_name": e.artist.name if e.artist else None,
        "artist_avatar": e.artist.avatar if e.artist else None,
        "is_published": e.is_published,
        "created_at": e.created_at,
    }


@router.get("/")
def get_events(
    skip: int = 0,
    limit: int = 20,
    city: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(models.Event).filter(models.Event.is_published == True)
    now = datetime.utcnow()
    q = q.filter(models.Event.date >= now)
    if city:
        q = q.filter(models.Event.location.ilike(f"%{city}%"))
    if from_date:
        try:
            q = q.filter(models.Event.date >= datetime.fromisoformat(from_date))
        except Exception:
            pass
    if to_date:
        try:
            q = q.filter(models.Event.date <= datetime.fromisoformat(to_date))
        except Exception:
            pass
    events = q.order_by(models.Event.date.asc()).offset(skip).limit(limit).all()
    return [_event_out(e) for e in events]


@router.get("/artist/{artist_id}")
def get_artist_events(artist_id: int, db: Session = Depends(get_db)):
    events = db.query(models.Event).filter(
        models.Event.artist_id == artist_id,
        models.Event.is_published == True
    ).order_by(models.Event.date.asc()).all()
    return [_event_out(e) for e in events]


@router.get("/{event_id}")
def get_event(event_id: int, db: Session = Depends(get_db)):
    e = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not e:
        raise HTTPException(404)
    return _event_out(e)


@router.post("/")
async def create_event(
    title: str = Form(...),
    description: str = Form(""),
    date: str = Form(...),
    location: str = Form(""),
    tickets_url: str = Form(""),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    artist = db.query(models.Artist).filter(models.Artist.user_id == current_user.id).first()
    if not artist and current_user.role != "admin":
        raise HTTPException(403, "Только артисты могут создавать события")

    image_path = None
    if image and image.filename:
        content = await image.read()
        ext = os.path.splitext(image.filename)[1].lower() or ".jpg"
        filename = f"event_{uuid.uuid4().hex}{ext}"
        image_path = os.path.join(UPLOAD_DIR_EVENTS, filename)
        with open(image_path, "wb") as f:
            f.write(content)

    try:
        event_date = datetime.fromisoformat(date)
    except Exception:
        raise HTTPException(400, "Неверный формат даты")

    e = models.Event(
        title=title,
        description=description,
        date=event_date,
        location=location,
        tickets_url=tickets_url,
        image=image_path,
        artist_id=artist.id,
        is_published=True,
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return _event_out(e)


@router.put("/{event_id}")
async def update_event(
    event_id: int,
    title: str = Form(...),
    description: str = Form(""),
    date: str = Form(...),
    location: str = Form(""),
    tickets_url: str = Form(""),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    e = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not e:
        raise HTTPException(404)
    artist = db.query(models.Artist).filter(models.Artist.user_id == current_user.id).first()
    if current_user.role != "admin" and (not artist or artist.id != e.artist_id):
        raise HTTPException(403)

    e.title = title
    e.description = description
    e.location = location
    e.tickets_url = tickets_url
    try:
        e.date = datetime.fromisoformat(date)
    except Exception:
        pass

    if image and image.filename:
        content = await image.read()
        ext = os.path.splitext(image.filename)[1].lower() or ".jpg"
        filename = f"event_{uuid.uuid4().hex}{ext}"
        image_path = os.path.join(UPLOAD_DIR_EVENTS, filename)
        with open(image_path, "wb") as f:
            f.write(content)
        e.image = image_path

    db.commit()
    db.refresh(e)
    return _event_out(e)


@router.delete("/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    e = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not e:
        raise HTTPException(404)
    artist = db.query(models.Artist).filter(models.Artist.user_id == current_user.id).first()
    if current_user.role != "admin" and (not artist or artist.id != e.artist_id):
        raise HTTPException(403)
    db.delete(e)
    db.commit()
    return {"ok": True}


@router.patch("/{event_id}/hide")
def hide_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(403)
    e = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not e:
        raise HTTPException(404)
    e.is_published = False
    db.commit()
    return {"ok": True}


@router.get("/admin/all")
def get_all_events_admin(
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    """Все мероприятия для администратора включая скрытые."""
    if current_user.role != "admin":
        raise HTTPException(403)
    events = db.query(models.Event).order_by(models.Event.date.asc()).offset(skip).limit(limit).all()
    return [_event_out(e) for e in events]


@router.patch("/{event_id}/publish")
def publish_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(403)
    e = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not e:
        raise HTTPException(404)
    e.is_published = True
    db.commit()
    return {"ok": True}
