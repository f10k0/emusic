from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import os
import shutil
from datetime import datetime
from typing import Optional

from database import get_db
import models, schemas, dependencies

router = APIRouter(prefix="/submissions", tags=["submissions"])

UPLOAD_DIR = "uploads/"
UPLOAD_DIR_TRACK_COVERS = "uploads/track_covers/"


@router.post("/", response_model=schemas.SubmissionOut)
async def create_submission(
    title: str = Form(...),
    duration: int = Form(0),
    album_id: Optional[int] = Form(None),
    file: UploadFile = File(...),
    current_user: models.User = Depends(dependencies.require_role("artist")),
    db: Session = Depends(get_db)
):
    artist = db.query(models.Artist).filter(models.Artist.user_id == current_user.id).first()
    if not artist:
        raise HTTPException(status_code=400, detail="You need to create an artist profile first")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_extension = os.path.splitext(file.filename)[1]
    file_name = f"{datetime.utcnow().timestamp()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    new_track = models.Track(
        title=title,
        duration=duration,
        album_id=album_id,
        artist_id=artist.id,
        file_path=file_path,
        is_published=False
    )
    db.add(new_track)
    db.commit()
    db.refresh(new_track)

    submission = models.Submission(
        artist_id=artist.id,
        track_id=new_track.id,
        status="pending"
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    return submission


@router.get("/tracks/{track_id}", response_model=schemas.TrackOut)
def get_track(
    track_id: int,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    track = db.query(models.Track).filter(models.Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    if current_user.role == "artist":
        artist = db.query(models.Artist).filter(models.Artist.user_id == current_user.id).first()
        if not artist or track.artist_id != artist.id:
            raise HTTPException(status_code=403, detail="You can only edit your own tracks")
    else:
        raise HTTPException(status_code=403, detail="Only artists can edit tracks")
    
    return track


@router.put("/tracks/{track_id}", response_model=schemas.TrackOut)
def update_track(
    track_id: int,
    track_data: schemas.TrackUpdate,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    track = db.query(models.Track).filter(models.Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    if current_user.role == "artist":
        artist = db.query(models.Artist).filter(models.Artist.user_id == current_user.id).first()
        if not artist or track.artist_id != artist.id:
            raise HTTPException(status_code=403, detail="You can only edit your own tracks")
    else:
        raise HTTPException(status_code=403, detail="Only artists can edit tracks")
    
    print(f"Получены данные для обновления: {track_data.dict()}")  # отладка
    
    # Обновляем поля
    if track_data.title is not None:
        track.title = track_data.title
    if track_data.duration is not None:
        track.duration = track_data.duration
    if track_data.album_id is not None:
        # Проверяем существование альбома
        if track_data.album_id:
            album = db.query(models.Album).filter(models.Album.id == track_data.album_id).first()
            if not album:
                raise HTTPException(status_code=400, detail="Album not found")
            # Проверяем, что альбом принадлежит артисту
            if album.artist_id != track.artist_id:
                raise HTTPException(status_code=400, detail="Album doesn't belong to you")
        track.album_id = track_data.album_id
    if track_data.cover is not None:
        track.cover = track_data.cover
    
    db.commit()
    db.refresh(track)
    print(f"Трек после обновления: {track.id}, title={track.title}, album_id={track.album_id}")  # отладка
    return track


@router.post("/tracks/{track_id}/cover")
async def upload_track_cover(
    track_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    track = db.query(models.Track).filter(models.Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    if current_user.role == "artist":
        artist = db.query(models.Artist).filter(models.Artist.user_id == current_user.id).first()
        if not artist or track.artist_id != artist.id:
            raise HTTPException(status_code=403, detail="You can only edit your own tracks")
    else:
        raise HTTPException(status_code=403, detail="Only artists can edit tracks")
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    os.makedirs(UPLOAD_DIR_TRACK_COVERS, exist_ok=True)
    
    file_extension = os.path.splitext(file.filename)[1]
    file_name = f"track_{track_id}_{int(datetime.utcnow().timestamp())}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR_TRACK_COVERS, file_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    track.cover = file_path
    db.commit()
    
    return {"cover_url": file_path}


@router.delete("/tracks/{track_id}")
def delete_track(
    track_id: int,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    track = db.query(models.Track).filter(models.Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    if current_user.role == "artist":
        artist = db.query(models.Artist).filter(models.Artist.user_id == current_user.id).first()
        if not artist or track.artist_id != artist.id:
            raise HTTPException(status_code=403, detail="You can only delete your own tracks")
    else:
        raise HTTPException(status_code=403, detail="Only artists can delete tracks")
    
    if os.path.exists(track.file_path):
        os.remove(track.file_path)
    if hasattr(track, 'cover') and track.cover and os.path.exists(track.cover):
        os.remove(track.cover)
    
    submissions = db.query(models.Submission).filter(models.Submission.track_id == track_id).all()
    for sub in submissions:
        db.delete(sub)
    
    db.delete(track)
    db.commit()
    
    return {"message": "Track deleted successfully"}