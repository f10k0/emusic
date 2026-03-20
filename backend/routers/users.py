import os
import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, auth
import dependencies

UPLOAD_DIR_AVATARS = "uploads/avatars/"

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/register", response_model=schemas.UserOut)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if len(user.password) > 72:
        raise HTTPException(
            status_code=400,
            detail="Password is too long. Maximum length is 72 characters."
        )

    db_user = db.query(models.User).filter(
        (models.User.username == user.username) | (models.User.email == user.email)
    ).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    hashed = auth.get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed,
        role="user",
        avatar=None
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/token", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserOut)
def read_users_me(current_user: models.User = Depends(dependencies.get_current_active_user)):
    return current_user


@router.put("/me", response_model=schemas.UserOut)
def update_user(updated: schemas.UserCreate, current_user: models.User = Depends(dependencies.get_current_active_user), db: Session = Depends(get_db)):
    current_user.username = updated.username
    current_user.email = updated.email
    if updated.password:
        current_user.hashed_password = auth.get_password_hash(updated.password)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(get_db)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    os.makedirs("uploads/avatars", exist_ok=True)
    
    file_extension = os.path.splitext(file.filename)[1]
    file_name = f"user_{current_user.id}_{int(datetime.utcnow().timestamp())}{file_extension}"
    file_path = f"uploads/avatars/{file_name}"
    
    full_path = os.path.join("uploads/avatars", file_name)
    with open(full_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    current_user.avatar = file_path
    db.commit()
    
    return {"avatar_url": file_path}