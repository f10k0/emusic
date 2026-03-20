from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from datetime import datetime

from database import get_db
import models, schemas, dependencies

router = APIRouter(prefix="/artists", tags=["artists"])


@router.post("/", response_model=schemas.ArtistOut)
def create_artist(
    artist: schemas.ArtistCreate,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    existing = db.query(models.Artist).filter(models.Artist.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Artist profile already exists")

    new_artist = models.Artist(
        name=artist.name,
        bio=artist.bio,
        avatar=artist.avatar,
        user_id=current_user.id
    )
    db.add(new_artist)

    current_user.role = "artist"

    db.commit()
    db.refresh(new_artist)
    return new_artist


@router.get("/me", response_model=schemas.ArtistOut)
def get_my_artist_profile(
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "artist":
        raise HTTPException(status_code=403, detail="User is not an artist")
    artist = db.query(models.Artist).filter(models.Artist.user_id == current_user.id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist profile not found")
    return artist


@router.put("/me", response_model=schemas.ArtistOut)
def update_artist_profile(
    artist_data: schemas.ArtistUpdate,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "artist":
        raise HTTPException(status_code=403, detail="User is not an artist")
    artist = db.query(models.Artist).filter(models.Artist.user_id == current_user.id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist profile not found")

    if artist_data.name is not None:
        artist.name = artist_data.name
    if artist_data.bio is not None:
        artist.bio = artist_data.bio
    if artist_data.avatar is not None:
        artist.avatar = artist_data.avatar

    db.commit()
    db.refresh(artist)
    return artist


@router.post("/me/avatar")
async def upload_artist_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "artist":
        raise HTTPException(status_code=403, detail="User is not an artist")
    artist = db.query(models.Artist).filter(models.Artist.user_id == current_user.id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist profile not found")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    os.makedirs("uploads/artist_avatars", exist_ok=True)

    ext = os.path.splitext(file.filename)[1]
    filename = f"artist_{artist.id}_{int(datetime.utcnow().timestamp())}{ext}"
    file_path = os.path.join("uploads/artist_avatars", filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    artist.avatar = file_path
    db.commit()

    return {"avatar_url": artist.avatar}


@router.get("/me/tracks", response_model=List[schemas.TrackOut])
def get_my_tracks(
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "artist":
        raise HTTPException(status_code=403, detail="User is not an artist")
    artist = db.query(models.Artist).filter(models.Artist.user_id == current_user.id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist profile not found")
    return db.query(models.Track).filter(models.Track.artist_id == artist.id).all()


@router.get("/{artist_id}")
def get_artist(
    artist_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(dependencies.optional_current_user)
):
    artist = db.query(models.Artist).filter(models.Artist.id == artist_id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")

    albums = db.query(models.Album).filter(
        models.Album.artist_id == artist_id,
        models.Album.is_published == True
    ).all()

    tracks = db.query(models.Track).filter(
        models.Track.artist_id == artist_id,
        models.Track.is_published == True
    ).all()

    liked_artist = False
    if current_user:
        liked_artist = artist in current_user.favorite_artists

    artist_dict = {
        "id": artist.id,
        "name": artist.name,
        "bio": artist.bio,
        "avatar": artist.avatar,
        "user_id": artist.user_id,
        "liked": liked_artist
    }

    albums_out = []
    for album in albums:
        album_data = schemas.AlbumOut.model_validate(album)
        album_data.liked = current_user and (album in current_user.favorite_albums) if current_user else False
        albums_out.append(album_data)

    tracks_out = []
    for track in tracks:
        track_data = schemas.TrackOut.model_validate(track)
        track_data.liked = current_user and (track in current_user.favorite_tracks) if current_user else False
        tracks_out.append(track_data)

    return {
        "artist": artist_dict,
        "albums": albums_out,
        "tracks": tracks_out
    }