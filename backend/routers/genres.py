from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
import models, schemas, dependencies

router = APIRouter(prefix="/genres", tags=["genres"])


@router.get("/", response_model=List[schemas.GenreOut])
def get_all_genres(db: Session = Depends(get_db)):
    genres = db.query(models.Genre).all()
    return genres


@router.get("/{genre_id}", response_model=schemas.GenreOut)
def get_genre(genre_id: int, db: Session = Depends(get_db)):
    genre = db.query(models.Genre).filter(models.Genre.id == genre_id).first()
    if not genre:
        raise HTTPException(status_code=404, detail="Genre not found")
    return genre


@router.get("/{genre_id}/tracks", response_model=List[schemas.TrackOut])
def get_genre_tracks(
    genre_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(dependencies.optional_current_user),
    skip: int = 0,
    limit: int = 100
):
    genre = db.query(models.Genre).filter(models.Genre.id == genre_id).first()
    if not genre:
        raise HTTPException(status_code=404, detail="Genre not found")
    tracks = (
        db.query(models.Track)
        .filter(models.Track.is_published == True, models.Track.genres.any(id=genre_id))
        .order_by(models.Track.play_count.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    result = []
    for track in tracks:
        track_data = schemas.TrackOut.model_validate(track)
        track_data.liked = current_user and (track in current_user.favorite_tracks) if current_user else False
        result.append(track_data)
    return result


@router.post("/", response_model=schemas.GenreOut)
def create_genre(
    genre: schemas.GenreCreate,
    current_user: models.User = Depends(dependencies.require_role("admin")),
    db: Session = Depends(get_db)
):
    existing = db.query(models.Genre).filter(
        (models.Genre.name == genre.name) | (models.Genre.slug == genre.slug)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Genre with this name or slug already exists")
    new_genre = models.Genre(**genre.dict())
    db.add(new_genre)
    db.commit()
    db.refresh(new_genre)
    return new_genre


@router.put("/{genre_id}", response_model=schemas.GenreOut)
def update_genre(
    genre_id: int,
    genre_data: schemas.GenreUpdate,
    current_user: models.User = Depends(dependencies.require_role("admin")),
    db: Session = Depends(get_db)
):
    genre = db.query(models.Genre).filter(models.Genre.id == genre_id).first()
    if not genre:
        raise HTTPException(status_code=404, detail="Genre not found")
    for key, value in genre_data.dict(exclude_unset=True).items():
        setattr(genre, key, value)
    db.commit()
    db.refresh(genre)
    return genre


@router.delete("/{genre_id}")
def delete_genre(
    genre_id: int,
    current_user: models.User = Depends(dependencies.require_role("admin")),
    db: Session = Depends(get_db)
):
    genre = db.query(models.Genre).filter(models.Genre.id == genre_id).first()
    if not genre:
        raise HTTPException(status_code=404, detail="Genre not found")
    db.delete(genre)
    db.commit()
    return {"message": "Genre deleted"}

