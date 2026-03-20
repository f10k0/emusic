from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from datetime import datetime

from database import get_db
import models, schemas, dependencies

router = APIRouter(prefix="/playlists", tags=["playlists"])


@router.post("/", response_model=schemas.PlaylistOut)
async def create_playlist(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    is_public: bool = Form(True),
    cover: Optional[UploadFile] = File(None),
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    cover_path = None
    if cover:
        # Проверка типа файла
        if not cover.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Создаём папку, если нет
        os.makedirs("uploads/playlist_covers", exist_ok=True)
        
        # Генерируем имя файла
        file_extension = os.path.splitext(cover.filename)[1]
        file_name = f"playlist_{current_user.id}_{int(datetime.utcnow().timestamp())}{file_extension}"
        file_path = os.path.join("uploads/playlist_covers", file_name)
        
        # Сохраняем файл
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(cover.file, buffer)
        
        cover_path = file_path
    
    new_playlist = models.Playlist(
        name=name,
        description=description,
        cover_image=cover_path,
        is_public=is_public,
        user_id=current_user.id
    )
    db.add(new_playlist)
    db.commit()
    db.refresh(new_playlist)
    return new_playlist


@router.get("/my", response_model=List[schemas.PlaylistOut])
def get_my_playlists(
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    playlists = db.query(models.Playlist).filter(models.Playlist.user_id == current_user.id).all()
    # Загружаем треки
    for pl in playlists:
        pl.tracks
    return playlists


@router.get("/public", response_model=List[schemas.PlaylistOut])
def get_public_playlists(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 20
):
    playlists = db.query(models.Playlist).filter(
        models.Playlist.is_public == True
    ).offset(skip).limit(limit).all()
    for pl in playlists:
        pl.tracks
    return playlists


@router.get("/{playlist_id}", response_model=schemas.PlaylistOut)
def get_playlist(
    playlist_id: int,
    current_user: Optional[models.User] = Depends(dependencies.optional_current_user),
    db: Session = Depends(get_db)
):
    playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    if not playlist.is_public and (not current_user or current_user.id != playlist.user_id):
        raise HTTPException(status_code=403, detail="Private playlist")
    
    playlist.tracks
    return playlist


@router.put("/{playlist_id}", response_model=schemas.PlaylistOut)
def update_playlist(
    playlist_id: int,
    playlist_data: schemas.PlaylistUpdate,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    if playlist.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your playlist")
    
    if playlist_data.name is not None:
        playlist.name = playlist_data.name
    if playlist_data.description is not None:
        playlist.description = playlist_data.description
    if playlist_data.cover_image is not None:
        playlist.cover_image = playlist_data.cover_image
    if playlist_data.is_public is not None:
        playlist.is_public = playlist_data.is_public
    
    db.commit()
    db.refresh(playlist)
    return playlist


@router.post("/{playlist_id}/tracks/{track_id}")
def add_track_to_playlist(
    playlist_id: int,
    track_id: int,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    if playlist.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your playlist")
    
    track = db.query(models.Track).filter(models.Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    if track in playlist.tracks:
        return {"message": "Track already in playlist"}
    
    playlist.tracks.append(track)
    db.commit()
    return {"message": "Track added to playlist"}


@router.delete("/{playlist_id}/tracks/{track_id}")
def remove_track_from_playlist(
    playlist_id: int,
    track_id: int,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    if playlist.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your playlist")
    
    track = db.query(models.Track).filter(models.Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    if track not in playlist.tracks:
        raise HTTPException(status_code=404, detail="Track not in playlist")
    
    playlist.tracks.remove(track)
    db.commit()
    return {"message": "Track removed from playlist"}


@router.delete("/{playlist_id}")
def delete_playlist(
    playlist_id: int,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    if playlist.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your playlist")
    
    db.delete(playlist)
    db.commit()
    return {"message": "Playlist deleted successfully"}

@router.get("/user/{user_id}", response_model=List[schemas.PlaylistOut])
def get_user_public_playlists(
    user_id: int,
    db: Session = Depends(get_db)
):
    playlists = db.query(models.Playlist).filter(
        models.Playlist.user_id == user_id,
        models.Playlist.is_public == True
    ).all()
    # Загружаем треки для каждого плейлиста (опционально)
    for pl in playlists:
        pl.tracks
    return playlists