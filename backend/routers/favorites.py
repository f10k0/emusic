from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, dependencies

router = APIRouter(prefix="/favorites", tags=["favorites"])

# Добавление/удаление трека в избранное
@router.post("/tracks/{track_id}")
def toggle_favorite_track(
    track_id: int,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    track = db.query(models.Track).filter(models.Track.id == track_id, models.Track.is_published == True).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    if track in current_user.favorite_tracks:
        current_user.favorite_tracks.remove(track)
        db.commit()
        return {"message": "Track removed from favorites"}
    else:
        current_user.favorite_tracks.append(track)
        db.commit()
        return {"message": "Track added to favorites"}

# Добавление/удаление альбома в избранное
@router.post("/albums/{album_id}")
def toggle_favorite_album(
    album_id: int,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    album = db.query(models.Album).filter(models.Album.id == album_id, models.Album.is_published == True).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    if album in current_user.favorite_albums:
        current_user.favorite_albums.remove(album)
        db.commit()
        return {"message": "Album removed from favorites"}
    else:
        current_user.favorite_albums.append(album)
        db.commit()
        return {"message": "Album added to favorites"}

# Добавление/удаление артиста в избранное
@router.post("/artists/{artist_id}")
def toggle_favorite_artist(
    artist_id: int,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    artist = db.query(models.Artist).filter(models.Artist.id == artist_id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    if artist in current_user.favorite_artists:
        current_user.favorite_artists.remove(artist)
        db.commit()
        return {"message": "Artist removed from favorites"}
    else:
        current_user.favorite_artists.append(artist)
        db.commit()
        return {"message": "Artist added to favorites"}

# ПОЛУЧЕНИЕ ИЗБРАННЫХ ТРЕКОВ
@router.get("/tracks", response_model=schemas.FavoriteTracks)
def get_favorite_tracks(
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    return {"tracks": current_user.favorite_tracks}

# ПОЛУЧЕНИЕ ИЗБРАННЫХ АЛЬБОМОВ
@router.get("/albums", response_model=schemas.FavoriteAlbums)
def get_favorite_albums(
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    return {"albums": current_user.favorite_albums}

# ПОЛУЧЕНИЕ ИЗБРАННЫХ АРТИСТОВ
@router.get("/artists", response_model=schemas.FavoriteArtists)
def get_favorite_artists(
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    return {"artists": current_user.favorite_artists}