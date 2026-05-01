from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from datetime import datetime

from database import get_db
import models, schemas, dependencies

router = APIRouter(prefix="/albums", tags=["albums"])


@router.post("/", response_model=schemas.AlbumOut)
def create_album(
    album: schemas.AlbumCreate,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "artist":
        raise HTTPException(status_code=403, detail="Only artists can create albums")
    
    artist = db.query(models.Artist).filter(models.Artist.user_id == current_user.id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist profile not found")
    
    new_album = models.Album(
        title=album.title,
        release_date=album.release_date,
        cover_image=album.cover_image,
        type=album.type,
        artist_id=artist.id,
        is_published=False
    )
    db.add(new_album)
    db.commit()
    db.refresh(new_album)
    return new_album


@router.get("/me", response_model=List[schemas.AlbumOut])
def get_my_albums(
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "artist":
        raise HTTPException(status_code=403, detail="Only artists can view their albums")
    
    artist = db.query(models.Artist).filter(models.Artist.user_id == current_user.id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist profile not found")
    
    albums = db.query(models.Album).filter(models.Album.artist_id == artist.id).all()
    return albums


@router.get("/{album_id}", response_model=schemas.AlbumOut)
def get_album(
    album_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(dependencies.optional_current_user)
):
    album = db.query(models.Album).filter(models.Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    
    if not album.is_published and (not current_user or current_user.id != album.artist.user_id):
        raise HTTPException(status_code=403, detail="Album not published")
    
    tracks = db.query(models.Track).filter(
        models.Track.album_id == album_id,
        models.Track.is_published == True
    ).all()
    
    liked = False
    if current_user:
        liked = album in current_user.favorite_albums
    
    album_data = {
        "id": album.id,
        "title": album.title,
        "release_date": album.release_date,
        "cover_image": album.cover_image,
        "type": album.type,
        "artist_id": album.artist_id,
        "is_published": album.is_published,
        "artist_name": album.artist.name if album.artist else None,
        "liked": liked,
        "tracks": []
    }
    
    for track in tracks:
        track_data = schemas.TrackOut.model_validate(track)
        track_data.artist_name = album.artist.name if album.artist else None
        track_data.liked = current_user and (track in current_user.favorite_tracks) if current_user else False
        album_data["tracks"].append(track_data)
    
    return album_data


@router.put("/{album_id}", response_model=schemas.AlbumOut)
def update_album(
    album_id: int,
    album_data: schemas.AlbumUpdate,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "artist":
        raise HTTPException(status_code=403, detail="Only artists can update albums")
    
    album = db.query(models.Album).filter(models.Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    
    if album.artist.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your album")
    
    if album_data.title is not None:
        album.title = album_data.title
    if album_data.release_date is not None:
        album.release_date = album_data.release_date
    if album_data.cover_image is not None:
        album.cover_image = album_data.cover_image
    if album_data.type is not None:
        album.type = album_data.type
    
    db.commit()
    db.refresh(album)
    return album


@router.post("/{album_id}/cover")
async def upload_album_cover(
    album_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "artist":
        raise HTTPException(status_code=403, detail="Only artists can update albums")
    
    album = db.query(models.Album).filter(models.Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    
    if album.artist.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your album")
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    os.makedirs("uploads/album_covers", exist_ok=True)
    
    ext = os.path.splitext(file.filename)[1]
    filename = f"album_{album_id}_{int(datetime.utcnow().timestamp())}{ext}"
    file_path = os.path.join("uploads/album_covers", filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    album.cover_image = file_path
    db.commit()
    
    return {"cover_url": file_path}


@router.put("/{album_id}/publish")
def publish_album(
    album_id: int,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "artist":
        raise HTTPException(status_code=403, detail="Only artists can publish albums")
    
    album = db.query(models.Album).filter(models.Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    
    if album.artist.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your album")
    
    album.is_published = True
    db.commit()
    return {"message": "Album published successfully"}


@router.delete("/{album_id}")
def delete_album(
    album_id: int,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "artist":
        raise HTTPException(status_code=403, detail="Only artists can delete albums")
    
    album = db.query(models.Album).filter(models.Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    
    if album.artist.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your album")
    
    if album.cover_image and os.path.exists(album.cover_image):
        os.remove(album.cover_image)
    
    db.delete(album)
    db.commit()
    return {"message": "Album deleted successfully"}


@router.get("/artist/{artist_id}")
def get_artist_albums(
    artist_id: int,
    db: Session = Depends(get_db)
):
    artist = db.query(models.Artist).filter(models.Artist.id == artist_id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    
    albums = db.query(models.Album).filter(
        models.Album.artist_id == artist_id,
        models.Album.is_published == True
    ).all()
    return albums