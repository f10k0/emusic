from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from datetime import datetime

from database import get_db
import models, schemas, dependencies

router = APIRouter(prefix="/news", tags=["news"])

UPLOAD_DIR_NEWS = "uploads/news/"


# Публичные эндпоинты
@router.get("/", response_model=List[schemas.NewsOut])
def get_all_news(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 20
):
    news = db.query(models.News).filter(models.News.is_published == True).order_by(models.News.created_at.desc()).offset(skip).limit(limit).all()
    return news


@router.get("/{news_id}", response_model=schemas.NewsOut)
def get_news(news_id: int, db: Session = Depends(get_db)):
    news = db.query(models.News).filter(models.News.id == news_id, models.News.is_published == True).first()
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    return news


# Админские эндпоинты
@router.post("/", response_model=schemas.NewsOut)
def create_news(
    news: schemas.NewsCreate,
    current_user: models.User = Depends(dependencies.require_role("admin")),
    db: Session = Depends(get_db)
):
    new_news = models.News(**news.dict())
    db.add(new_news)
    db.commit()
    db.refresh(new_news)
    return new_news


@router.put("/{news_id}", response_model=schemas.NewsOut)
def update_news(
    news_id: int,
    news_data: schemas.NewsUpdate,
    current_user: models.User = Depends(dependencies.require_role("admin")),
    db: Session = Depends(get_db)
):
    news = db.query(models.News).filter(models.News.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    
    for key, value in news_data.dict(exclude_unset=True).items():
        setattr(news, key, value)
    
    db.commit()
    db.refresh(news)
    return news


@router.post("/{news_id}/image")
async def upload_news_image(
    news_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(dependencies.require_role("admin")),
    db: Session = Depends(get_db)
):
    news = db.query(models.News).filter(models.News.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    os.makedirs(UPLOAD_DIR_NEWS, exist_ok=True)
    
    ext = os.path.splitext(file.filename)[1]
    filename = f"news_{news_id}_{int(datetime.utcnow().timestamp())}{ext}"
    file_path = os.path.join(UPLOAD_DIR_NEWS, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    news.image = file_path
    db.commit()
    
    return {"image_url": file_path}


@router.delete("/{news_id}")
def delete_news(
    news_id: int,
    current_user: models.User = Depends(dependencies.require_role("admin")),
    db: Session = Depends(get_db)
):
    news = db.query(models.News).filter(models.News.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    
    if news.image and os.path.exists(news.image):
        os.remove(news.image)
    
    db.delete(news)
    db.commit()
    return {"message": "News deleted successfully"}