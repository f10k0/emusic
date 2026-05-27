from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from typing import Optional
import os
from datetime import datetime, timedelta
from urllib.parse import quote

from database import get_db
import models, schemas, dependencies

router = APIRouter(prefix="/music", tags=["music"])


def _apply_adult_filter(query, current_user):
    if not current_user:
        return query.filter(models.Track.is_adult == False)
    settings = current_user.settings or {}
    if settings.get("hide_adult", True):
        return query.filter(models.Track.is_adult == False)
    return query


@router.get("/top", response_model=list[schemas.TrackOut])
def get_top_tracks(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(dependencies.optional_current_user)
):
    query = db.query(models.Track).filter(models.Track.is_published == True)
    query = _apply_adult_filter(query, current_user)
    tracks = query.order_by(models.Track.play_count.desc()).limit(limit).all()
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

    track_query = db.query(models.Track).filter(
        (models.Track.title.ilike(f"%{q}%") | models.Track.lyrics.ilike(f"%{q}%")),
        models.Track.is_published == True
    )
    track_query = _apply_adult_filter(track_query, current_user)
    tracks = track_query.all()

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

    return {"artists": artists_out, "albums": albums_out, "tracks": tracks_out, "genres": genres}


@router.get("/listen/{track_id}")
def listen_track(
    track_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(dependencies.optional_current_user)
):
    if current_user and current_user.role == "admin":
        track = db.query(models.Track).filter(models.Track.id == track_id).first()
    else:
        track = db.query(models.Track).filter(models.Track.id == track_id, models.Track.is_published == True).first()

    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    track.play_count += 1
    db.commit()

    # Записываем в историю прослушиваний
    if current_user:
        hist = models.ListeningHistory(user_id=current_user.id, track_id=track_id)
        db.add(hist)
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
    safe_filename = quote(f"{track.title}.mp3", safe='')
    return FileResponse(
        file_path,
        media_type="audio/mpeg",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{safe_filename}"}
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


@router.get("/track/{track_id}/lyrics")
def get_lyrics(track_id: int, db: Session = Depends(get_db)):
    track = db.query(models.Track).filter(models.Track.id == track_id).first()
    if not track:
        raise HTTPException(404, "Трек не найден")
    return {"lyrics": track.lyrics or ""}


@router.get("/chart", response_model=schemas.ChartResponse)
def get_chart(
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(dependencies.optional_current_user),
    limit: int = 100
):
    query = db.query(models.Track).filter(models.Track.is_published == True)
    query = _apply_adult_filter(query, current_user)
    tracks = query.order_by(models.Track.play_count.desc()).limit(limit).all()
    result = []
    for idx, track in enumerate(tracks, start=1):
        track_data = schemas.ChartTrackOut(
            id=track.id, title=track.title, artist_name=track.artist_name,
            artist_id=track.artist_id, cover=track.cover, play_count=track.play_count,
            liked=current_user and (track in current_user.favorite_tracks) if current_user else False,
            rank=idx
        )
        result.append(track_data)
    return {"tracks": result, "total": len(result)}


@router.get("/track/{track_id}")
def get_track_detail(
    track_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(dependencies.optional_current_user)
):
    track = db.query(models.Track).filter(models.Track.id == track_id, models.Track.is_published == True).first()
    if not track:
        raise HTTPException(404, "Трек не найден")
    liked = False
    if current_user:
        liked = track in current_user.favorite_tracks
    return {
        "id": track.id, "title": track.title, "duration": track.duration,
        "artist_id": track.artist_id, "artist_name": track.artist_name,
        "cover": track.cover, "play_count": track.play_count,
        "is_adult": track.is_adult, "lyrics": track.lyrics,
        "album_id": track.album_id,
        "liked": liked,
        "moods": [{"id": m.id, "name": m.name, "slug": m.slug, "emoji": m.emoji} for m in track.moods],
        "genres": [{"id": g.id, "name": g.name} for g in track.genres],
    }
