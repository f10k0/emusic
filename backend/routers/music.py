from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import os

from database import get_db
import models, schemas, dependencies

router = APIRouter(prefix="/music", tags=["music"])


@router.get("/top", response_model=list[schemas.TrackOut])
def get_top_tracks(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(dependencies.optional_current_user)
):
    tracks = db.query(models.Track).filter(models.Track.is_published == True).order_by(models.Track.play_count.desc()).limit(limit).all()
    result = []
    for track in tracks:
        track_data = schemas.TrackOut.model_validate(track)
        track_data.liked = current_user and (track in current_user.favorite_tracks) if current_user else False
        result.append(track_data)
    return result


@router.get("/search", response_model=schemas.SearchResult)
def search(
    q: str,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(dependencies.optional_current_user)
):
    artists = db.query(models.Artist).filter(models.Artist.name.ilike(f"%{q}%")).all()
    albums = db.query(models.Album).filter(models.Album.title.ilike(f"%{q}%"), models.Album.is_published == True).all()
    tracks = db.query(models.Track).filter(models.Track.title.ilike(f"%{q}%"), models.Track.is_published == True).all()
    genres = db.query(models.Genre).filter(models.Genre.name.ilike(f"%{q}%")).all()
    
    artists_out = []
    for artist in artists:
        artist_data = schemas.ArtistOut.model_validate(artist)
        artist_data.liked = current_user and (artist in current_user.favorite_artists) if current_user else False
        artists_out.append(artist_data)
    
    albums_out = []
    for album in albums:
        album_data = schemas.AlbumOut.model_validate(album)
        album_data.artist_name = album.artist.name if album.artist else None
        album_data.liked = current_user and (album in current_user.favorite_albums) if current_user else False
        albums_out.append(album_data)
    
    tracks_out = []
    for track in tracks:
        track_data = schemas.TrackOut.model_validate(track)
        track_data.liked = current_user and (track in current_user.favorite_tracks) if current_user else False
        tracks_out.append(track_data)
    
    return {
        "artists": artists_out,
        "albums": albums_out,
        "tracks": tracks_out,
        "genres": genres
    }


@router.get("/listen/{track_id}")
def listen_track(track_id: int, db: Session = Depends(get_db)):
    track = db.query(models.Track).filter(models.Track.id == track_id, models.Track.is_published == True).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    track.play_count += 1
    db.commit()
    file_path = track.file_path
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="audio/mpeg", filename=f"{track.title}.mp3")


@router.get("/download/{track_id}")
def download_track(
    track_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    track = db.query(models.Track).filter(models.Track.id == track_id, models.Track.is_published == True).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    file_path = track.file_path
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        file_path, 
        media_type="audio/mpeg", 
        filename=f"{track.title}.mp3",
        headers={"Content-Disposition": f"attachment; filename={track.title}.mp3"}
    )


@router.get("/track/{track_id}", response_model=schemas.TrackOut)
def get_track(
    track_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(dependencies.optional_current_user)
):
    track = db.query(models.Track).filter(models.Track.id == track_id, models.Track.is_published == True).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    track_data = schemas.TrackOut.model_validate(track)
    track_data.liked = current_user and (track in current_user.favorite_tracks) if current_user else False
    return track_data


@router.get("/chart", response_model=schemas.ChartResponse)
def get_chart(
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(dependencies.optional_current_user),
    limit: int = 100
):
    tracks = db.query(models.Track).filter(models.Track.is_published == True).order_by(models.Track.play_count.desc()).limit(limit).all()
    result = []
    for idx, track in enumerate(tracks, start=1):
        track_data = schemas.ChartTrackOut(
            id=track.id,
            title=track.title,
            artist_name=track.artist_name,
            artist_id=track.artist_id,
            cover=track.cover,
            play_count=track.play_count,
            liked=current_user and (track in current_user.favorite_tracks) if current_user else False,
            rank=idx
        )
        result.append(track_data)
    return {"tracks": result, "total": len(result)}