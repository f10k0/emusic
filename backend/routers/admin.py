import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import os
import shutil
from datetime import datetime, timedelta

from database import get_db
import models, schemas, dependencies

router = APIRouter(prefix="/admin", tags=["admin"])

# Расширенное логгирование в памяти
admin_logs = []
command_logs = []

def add_admin_log(admin_username, action, details):
    admin_logs.append({
        "id": len(admin_logs) + 1,
        "admin": admin_username,
        "action": action,
        "details": details,
        "timestamp": datetime.utcnow().isoformat()
    })
    if len(admin_logs) > 200:
        admin_logs.pop(0)

def add_command_log(admin_username, command, args, result):
    command_logs.append({
        "id": len(command_logs) + 1,
        "admin": admin_username,
        "command": command,
        "args": args,
        "result": result,
        "timestamp": datetime.utcnow().isoformat()
    })
    if len(command_logs) > 100:
        command_logs.pop(0)


@router.get("/submissions/pending", response_model=List[schemas.SubmissionOut])
def get_pending_submissions(
    current_admin: models.User = Depends(dependencies.require_role("admin")),
    db: Session = Depends(get_db)
):
    submissions = db.query(models.Submission).filter(models.Submission.status == "pending").all()
    add_admin_log(current_admin.username, "Просмотр", f"Просмотр ожидающих заявок ({len(submissions)} шт.)")
    return submissions


@router.put("/submissions/{submission_id}/approve")
def approve_submission(
    submission_id: int,
    current_admin: models.User = Depends(dependencies.require_role("admin")),
    db: Session = Depends(get_db)
):
    submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    if submission.status != "pending":
        raise HTTPException(status_code=400, detail="Submission already processed")

    submission.status = "approved"
    submission.reviewed_at = datetime.utcnow()
    
    if submission.track:
        submission.track.is_published = True
        track_title = submission.track.title
    else:
        raise HTTPException(status_code=404, detail="Track not found")
    
    db.commit()
    add_admin_log(current_admin.username, "Одобрение", f"Одобрен трек '{track_title}' (ID: {submission_id})")
    return {"message": "Submission approved"}


@router.put("/submissions/{submission_id}/reject")
def reject_submission(
    submission_id: int,
    current_admin: models.User = Depends(dependencies.require_role("admin")),
    db: Session = Depends(get_db)
):
    submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    if submission.status != "pending":
        raise HTTPException(status_code=400, detail="Submission already processed")

    submission.status = "rejected"
    submission.reviewed_at = datetime.utcnow()
    
    if submission.track:
        track_title = submission.track.title
    else:
        track_title = "Unknown"
    
    db.commit()
    add_admin_log(current_admin.username, "Отклонение", f"Отклонен трек '{track_title}' (ID: {submission_id})")
    return {"message": "Submission rejected"}


@router.get("/tracks", response_model=List[schemas.TrackOut])
def get_all_tracks(
    current_admin: models.User = Depends(dependencies.require_role("admin")),
    db: Session = Depends(get_db)
):
    tracks = db.query(models.Track).all()
    add_admin_log(current_admin.username, "Просмотр", f"Просмотр всех треков ({len(tracks)} шт.)")
    return tracks


@router.delete("/tracks/{track_id}")
def admin_delete_track(
    track_id: int,
    current_admin: models.User = Depends(dependencies.require_role("admin")),
    db: Session = Depends(get_db)
):
    track = db.query(models.Track).filter(models.Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    track_title = track.title
    
    if os.path.exists(track.file_path):
        os.remove(track.file_path)
    
    if hasattr(track, 'cover') and track.cover and os.path.exists(track.cover):
        os.remove(track.cover)
    
    submissions = db.query(models.Submission).filter(models.Submission.track_id == track_id).all()
    for sub in submissions:
        db.delete(sub)
    
    db.delete(track)
    db.commit()
    
    add_admin_log(current_admin.username, "Удаление", f"Удален трек '{track_title}' (ID: {track_id})")
    return {"message": "Track deleted successfully by admin"}


# РАСШИРЕННАЯ СТАТИСТИКА
@router.get("/stats")
def get_platform_stats(
    current_admin: models.User = Depends(dependencies.require_role("admin")),
    db: Session = Depends(get_db)
):
    # Основные счетчики
    total_users = db.query(models.User).count()
    total_artists = db.query(models.Artist).count()
    total_tracks = db.query(models.Track).count()
    published_tracks = db.query(models.Track).filter(models.Track.is_published == True).count()
    pending_submissions = db.query(models.Submission).filter(models.Submission.status == "pending").count()
    
    # Детальная статистика
    total_play_count = db.query(func.sum(models.Track.play_count)).scalar() or 0
    total_albums = db.query(models.Album).count()
    total_playlists = db.query(models.Playlist).count()
    
    # Активность за последние 24 часа
    last_24h = datetime.utcnow() - timedelta(days=1)
    new_users_24h = db.query(models.User).filter(models.User.created_at >= last_24h).count()
    new_tracks_24h = db.query(models.Track).filter(models.Track.submissions.any(
        models.Submission.submitted_at >= last_24h
    )).count()
    
    # Топ треков
    top_tracks = db.query(models.Track).order_by(models.Track.play_count.desc()).limit(5).all()
    top_tracks_data = [{"id": t.id, "title": t.title, "plays": t.play_count, "artist": t.artist_name} for t in top_tracks]
    
    # Статистика по ролям
    admins_count = db.query(models.User).filter(models.User.role == "admin").count()
    users_count = db.query(models.User).filter(models.User.role == "user").count()
    
    stats = {
        "total_users": total_users,
        "total_artists": total_artists,
        "total_tracks": total_tracks,
        "published_tracks": published_tracks,
        "pending_submissions": pending_submissions,
        "total_play_count": total_play_count,
        "total_albums": total_albums,
        "total_playlists": total_playlists,
        "new_users_24h": new_users_24h,
        "new_tracks_24h": new_tracks_24h,
        "top_tracks": top_tracks_data,
        "admins_count": admins_count,
        "users_count": users_count,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    add_admin_log(current_admin.username, "Статистика", "Просмотр расширенной статистики платформы")
    return stats


# ЛОГИ АДМИНА
@router.get("/logs")
def get_admin_logs(
    current_admin: models.User = Depends(dependencies.require_role("admin")),
    limit: int = 100
):
    return {"logs": admin_logs[-limit:]}


# ЛОГИ КОМАНД
@router.get("/command-logs")
def get_command_logs(
    current_admin: models.User = Depends(dependencies.require_role("admin")),
    limit: int = 50
):
    return {"logs": command_logs[-limit:]}


# КОНСОЛЬНЫЕ КОМАНДЫ
@router.post("/command")
def execute_command(
    command: dict,
    current_admin: models.User = Depends(dependencies.require_role("admin")),
    db: Session = Depends(get_db)
):
    cmd = command.get("command", "").strip().lower()
    args = command.get("args", "")
    
    result = {"message": "Команда выполнена", "data": None}
    
    try:
        # help - список команд
        if cmd == "help":
            result["data"] = {
                "commands": [
                    {"name": "help", "desc": "Показать список команд"},
                    {"name": "stats", "desc": "Показать полную статистику"},
                    {"name": "users", "desc": "Список пользователей"},
                    {"name": "artists", "desc": "Список артистов"},
                    {"name": "tracks", "desc": "Список треков"},
                    {"name": "top [N]", "desc": "Топ N треков (по умолчанию 10)"},
                    {"name": "user [id/name]", "desc": "Информация о пользователе"},
                    {"name": "toggle-ban [id]", "desc": "Забанить/разбанить пользователя"},
                    {"name": "delete-track [id]", "desc": "Удалить трек по ID"},
                    {"name": "delete-user [id]", "desc": "Удалить пользователя (осторожно!)"},
                    {"name": "clear-logs", "desc": "Очистить логи команд"},
                ]
            }
        
        # stats - подробная статистика
        elif cmd == "stats":
            stats = get_platform_stats(current_admin, db)
            result["data"] = stats
        
        # users - список пользователей
        elif cmd == "users":
            users = db.query(models.User).limit(50).all()
            result["data"] = [
                {
                    "id": u.id, 
                    "username": u.username, 
                    "email": u.email, 
                    "role": u.role, 
                    "is_active": u.is_active,
                    "created": u.created_at.isoformat()
                }
                for u in users
            ]
        
        # artists - список артистов
        elif cmd == "artists":
            artists = db.query(models.Artist).limit(50).all()
            result["data"] = [
                {"id": a.id, "name": a.name, "user_id": a.user_id, "tracks_count": len(a.tracks)}
                for a in artists
            ]
        
        # tracks - список треков
        elif cmd == "tracks":
            tracks = db.query(models.Track).limit(50).all()
            result["data"] = [
                {"id": t.id, "title": t.title, "artist": t.artist_name, "plays": t.play_count, "published": t.is_published}
                for t in tracks
            ]
        
        # top [N] - топ треков
        elif cmd == "top":
            n = 10
            if args:
                try:
                    n = int(args.split()[0])
                except:
                    pass
            tracks = db.query(models.Track).order_by(models.Track.play_count.desc()).limit(n).all()
            result["data"] = [
                {"id": t.id, "title": t.title, "artist": t.artist_name, "plays": t.play_count}
                for t in tracks
            ]
        
        # user [id/name] - информация о пользователе
        elif cmd == "user":
            if not args:
                result["message"] = "Укажите ID или имя пользователя"
            else:
                query = args.strip()
                user = None
                if query.isdigit():
                    user = db.query(models.User).filter(models.User.id == int(query)).first()
                else:
                    user = db.query(models.User).filter(models.User.username == query).first()
                
                if user:
                    result["data"] = {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "role": user.role,
                        "is_active": user.is_active,
                        "created": user.created_at.isoformat(),
                        "tracks_favorite": len(user.favorite_tracks),
                        "albums_favorite": len(user.favorite_albums),
                        "artists_favorite": len(user.favorite_artists),
                        "playlists": [{"id": p.id, "name": p.name} for p in user.playlists] if hasattr(user, 'playlists') else []
                    }
                else:
                    result["message"] = f"Пользователь '{query}' не найден"
        
        # toggle-ban [id] - заблокировать/разблокировать пользователя
        elif cmd == "toggle-ban":
            if not args or not args.strip().isdigit():
                result["message"] = "Укажите ID пользователя"
            else:
                user_id = int(args.strip())
                user = db.query(models.User).filter(models.User.id == user_id).first()
                if not user:
                    result["message"] = f"Пользователь с ID {user_id} не найден"
                elif user.role == "admin":
                    result["message"] = "Нельзя забанить администратора"
                else:
                    user.is_active = not user.is_active
                    db.commit()
                    status = "разбанен" if user.is_active else "забанен"
                    result["message"] = f"Пользователь '{user.username}' (ID: {user_id}) {status}"
                    add_admin_log(current_admin.username, "Бан" if not user.is_active else "Разбан", 
                                 f"Пользователь {user.username} (ID: {user_id}) {status}")
        
        # delete-track [id] - удалить трек
        elif cmd == "delete-track":
            if not args or not args.strip().isdigit():
                result["message"] = "Укажите ID трека"
            else:
                track_id = int(args.strip())
                track = db.query(models.Track).filter(models.Track.id == track_id).first()
                if not track:
                    result["message"] = f"Трек с ID {track_id} не найден"
                else:
                    title = track.title
                    if os.path.exists(track.file_path):
                        os.remove(track.file_path)
                    if hasattr(track, 'cover') and track.cover and os.path.exists(track.cover):
                        os.remove(track.cover)
                    db.delete(track)
                    db.commit()
                    result["message"] = f"Трек '{title}' (ID: {track_id}) удален"
                    add_admin_log(current_admin.username, "Удаление", f"Удален трек '{title}' (ID: {track_id})")
        
        # delete-user [id] - удалить пользователя (осторожно!)
        elif cmd == "delete-user":
            if not args or not args.strip().isdigit():
                result["message"] = "Укажите ID пользователя"
            else:
                user_id = int(args.strip())
                user = db.query(models.User).filter(models.User.id == user_id).first()
                if not user:
                    result["message"] = f"Пользователь с ID {user_id} не найден"
                elif user.role == "admin":
                    result["message"] = "Нельзя удалить администратора через консоль"
                else:
                    username = user.username
                    db.delete(user)
                    db.commit()
                    result["message"] = f"Пользователь '{username}' (ID: {user_id}) удален"
                    add_admin_log(current_admin.username, "Удаление", f"Удален пользователь '{username}' (ID: {user_id})")
        
        # clear-logs - очистить логи команд
        elif cmd == "clear-logs":
            command_logs.clear()
            result["message"] = "Логи команд очищены"
        
        else:
            result["message"] = f"Неизвестная команда: {cmd}. Введите 'help' для списка команд"
    
    except Exception as e:
        result["message"] = f"Ошибка выполнения команды: {str(e)}"
    
    add_command_log(current_admin.username, cmd, args, result["message"])
    return result


# ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЕЙ (для статистики)
@router.get("/users")
def get_users(
    current_admin: models.User = Depends(dependencies.require_role("admin")),
    db: Session = Depends(get_db),
    limit: int = 50
):
    users = db.query(models.User).limit(limit).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "created": u.created_at.isoformat(),
            "tracks_favorite": len(u.favorite_tracks)
        }
        for u in users
    ]


# ПОЛУЧЕНИЕ АРТИСТОВ
@router.get("/artists")
def get_artists(
    current_admin: models.User = Depends(dependencies.require_role("admin")),
    db: Session = Depends(get_db),
    limit: int = 50
):
    artists = db.query(models.Artist).limit(limit).all()
    return [
        {
            "id": a.id,
            "name": a.name,
            "user_id": a.user_id,
            "tracks_count": len(a.tracks),
            "albums_count": len(a.albums)
        }
        for a in artists
    ]