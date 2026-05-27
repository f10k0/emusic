"""
Роутер: система уровней, Ecoins, квесты, магазин, инвентарь.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import date, datetime
import random

from database import get_db
import models, dependencies

router = APIRouter(prefix="/gamification", tags=["gamification"])

# ──────────────────────────────────────────────────────────────
# Вспомогательные функции
# ──────────────────────────────────────────────────────────────

SECONDS_PER_LEVEL = 10 * 3600  # 10 часов = 1 уровень

def _level_from_seconds(seconds: int) -> int:
    return max(1, int(seconds // SECONDS_PER_LEVEL) + 1)

def _seconds_for_level(level: int) -> int:
    return (level - 1) * SECONDS_PER_LEVEL

def _get_or_create_progress(db: Session, user_id: int) -> models.UserProgress:
    p = db.query(models.UserProgress).filter_by(user_id=user_id).first()
    if not p:
        p = models.UserProgress(user_id=user_id)
        db.add(p)
        db.commit()
        db.refresh(p)
    return p

def _today() -> str:
    return date.today().isoformat()

# Предметы магазина по умолчанию (создаём при первом запросе)
DEFAULT_SHOP_ITEMS = [
    # avatar_frame
    {"name": "Золотая рамка",       "item_type": "avatar_frame", "value": "frame-gold",      "price": 200, "rarity": "epic",      "unlock_level": 0,  "description": "Сияющая золотая рамка для аватара"},
    {"name": "Неоновая рамка",      "item_type": "avatar_frame", "value": "frame-neon",      "price": 150, "rarity": "rare",      "unlock_level": 0,  "description": "Яркая неоновая рамка"},
    {"name": "Серебряная рамка",    "item_type": "avatar_frame", "value": "frame-silver",    "price": 80,  "rarity": "common",    "unlock_level": 0,  "description": "Классическая серебряная рамка"},
    {"name": "Огненная рамка",      "item_type": "avatar_frame", "value": "frame-fire",      "price": 300, "rarity": "legendary", "unlock_level": 10, "description": "Пламенная рамка для настоящих меломанов"},
    # nickname_color
    {"name": "Радужный ник",        "item_type": "nickname_color","value": "nick-rainbow",   "price": 250, "rarity": "epic",      "unlock_level": 10, "description": "Переливающийся радужный цвет никнейма"},
    {"name": "Золотой ник",         "item_type": "nickname_color","value": "nick-gold",      "price": 120, "rarity": "rare",      "unlock_level": 0,  "description": "Золотой цвет никнейма"},
    {"name": "Неоновый ник",        "item_type": "nickname_color","value": "nick-neon",      "price": 100, "rarity": "rare",      "unlock_level": 0,  "description": "Ярко-неоновый цвет никнейма"},
    # bg (фон профиля)
    {"name": "Звёздный фон",        "item_type": "bg",           "value": "bg-stars",        "price": 180, "rarity": "rare",      "unlock_level": 0,  "description": "Ночное звёздное небо"},
    {"name": "Градиентный фон",     "item_type": "bg",           "value": "bg-gradient",     "price": 90,  "rarity": "common",    "unlock_level": 0,  "description": "Плавный градиент"},
    {"name": "Неоновые волны",      "item_type": "bg",           "value": "bg-neon-waves",   "price": 220, "rarity": "epic",      "unlock_level": 5,  "description": "Анимированные неоновые волны"},
    # theme
    {"name": "Тема «Закат»",        "item_type": "theme",        "value": "sunset",          "price": 400, "rarity": "epic",      "unlock_level": 20, "description": "Тёплая оранжево-розовая цветовая тема"},
    {"name": "Тема «Лес»",          "item_type": "theme",        "value": "forest",          "price": 500, "rarity": "legendary", "unlock_level": 30, "description": "Глубокая тёмно-зелёная тема"},
    {"name": "Тема «Космос»",       "item_type": "theme",        "value": "space",           "price": 600, "rarity": "legendary", "unlock_level": 50, "description": "Тёмно-синяя тема с фиолетовыми акцентами"},
    # badge
    {"name": "Значок «Меломан»",    "item_type": "badge",        "value": "badge-meloman",   "price": 60,  "rarity": "common",    "unlock_level": 0,  "description": "Значок любителя музыки"},
    {"name": "Значок «Легенда»",    "item_type": "badge",        "value": "badge-legend",    "price": 350, "rarity": "legendary", "unlock_level": 50, "description": "Значок для настоящих легенд"},
]

# 50 квестов
DEFAULT_QUESTS = [
    # Лёгкие
    {"title": "Первый шаг",            "description": "Прослушай 1 трек",                         "quest_type": "listen_tracks",  "target_value": 1,  "ecoin_reward": 5,  "difficulty": "easy"},
    {"title": "Получасовка",           "description": "Слушай музыку 30 минут",                   "quest_type": "listen_minutes", "target_value": 30, "ecoin_reward": 10, "difficulty": "easy"},
    {"title": "Час музыки",            "description": "Слушай музыку 1 час",                      "quest_type": "listen_minutes", "target_value": 60, "ecoin_reward": 15, "difficulty": "easy"},
    {"title": "Пятёрка треков",        "description": "Прослушай 5 треков",                       "quest_type": "listen_tracks",  "target_value": 5,  "ecoin_reward": 10, "difficulty": "easy"},
    {"title": "Десятка треков",        "description": "Прослушай 10 треков",                      "quest_type": "listen_tracks",  "target_value": 10, "ecoin_reward": 15, "difficulty": "easy"},
    {"title": "Знакомство с жанрами",  "description": "Прослушай треки 2 разных жанров",          "quest_type": "listen_genres",  "target_value": 2,  "ecoin_reward": 10, "difficulty": "easy"},
    {"title": "Лайк!",                 "description": "Лайкни 1 трек",                            "quest_type": "like_tracks",    "target_value": 1,  "ecoin_reward": 5,  "difficulty": "easy"},
    {"title": "Три лайка",             "description": "Лайкни 3 трека",                           "quest_type": "like_tracks",    "target_value": 3,  "ecoin_reward": 8,  "difficulty": "easy"},
    {"title": "Своя подборка",         "description": "Создай 1 плейлист",                        "quest_type": "add_playlist",   "target_value": 1,  "ecoin_reward": 12, "difficulty": "easy"},
    {"title": "Утренний слушатель",    "description": "Слушай музыку утром (до 12:00)",            "quest_type": "listen_morning", "target_value": 1,  "ecoin_reward": 8,  "difficulty": "easy"},
    # Средние
    {"title": "Два часа музыки",       "description": "Слушай музыку 2 часа",                     "quest_type": "listen_minutes", "target_value": 120,"ecoin_reward": 25, "difficulty": "medium"},
    {"title": "Двадцатка треков",      "description": "Прослушай 20 треков",                      "quest_type": "listen_tracks",  "target_value": 20, "ecoin_reward": 25, "difficulty": "medium"},
    {"title": "Рок-сессия",            "description": "Прослушай 5 треков жанра Рок",             "quest_type": "listen_genre",   "target_value": 5,  "target_ref": "rock",  "ecoin_reward": 20, "difficulty": "medium"},
    {"title": "Поп-марафон",           "description": "Прослушай 5 треков жанра Поп",             "quest_type": "listen_genre",   "target_value": 5,  "target_ref": "pop",   "ecoin_reward": 20, "difficulty": "medium"},
    {"title": "Хип-хоп",               "description": "Прослушай 5 треков жанра Хип-хоп",        "quest_type": "listen_genre",   "target_value": 5,  "target_ref": "hiphop","ecoin_reward": 20, "difficulty": "medium"},
    {"title": "Классика вечером",      "description": "Прослушай 3 классических трека",           "quest_type": "listen_genre",   "target_value": 3,  "target_ref": "classical","ecoin_reward": 20,"difficulty": "medium"},
    {"title": "Электронщик",           "description": "Прослушай 5 электронных треков",           "quest_type": "listen_genre",   "target_value": 5,  "target_ref": "electronic","ecoin_reward": 20,"difficulty": "medium"},
    {"title": "Джазовый вечер",        "description": "Прослушай 3 джазовых трека",               "quest_type": "listen_genre",   "target_value": 3,  "target_ref": "jazz",  "ecoin_reward": 18, "difficulty": "medium"},
    {"title": "Десять лайков",         "description": "Лайкни 10 треков",                         "quest_type": "like_tracks",    "target_value": 10, "ecoin_reward": 20, "difficulty": "medium"},
    {"title": "Три часа подряд",       "description": "Слушай музыку 3 часа",                     "quest_type": "listen_minutes", "target_value": 180,"ecoin_reward": 35, "difficulty": "medium"},
    {"title": "Открытие новых",        "description": "Прослушай 3 трека из чарта",               "quest_type": "listen_chart",   "target_value": 3,  "ecoin_reward": 20, "difficulty": "medium"},
    {"title": "Ночная сессия",         "description": "Слушай музыку после 22:00",                "quest_type": "listen_night",   "target_value": 1,  "ecoin_reward": 15, "difficulty": "medium"},
    {"title": "Плейлист из 5 треков",  "description": "Добавь 5 треков в плейлист",               "quest_type": "playlist_tracks","target_value": 5,  "ecoin_reward": 18, "difficulty": "medium"},
    {"title": "Пять жанров",           "description": "Прослушай треки 5 разных жанров",          "quest_type": "listen_genres",  "target_value": 5,  "ecoin_reward": 22, "difficulty": "medium"},
    {"title": "Ритм-марафон",          "description": "Прослушай 15 треков подряд",               "quest_type": "listen_tracks",  "target_value": 15, "ecoin_reward": 20, "difficulty": "medium"},
    # Сложные
    {"title": "Меломан дня",           "description": "Слушай музыку 5 часов",                    "quest_type": "listen_minutes", "target_value": 300,"ecoin_reward": 60, "difficulty": "hard"},
    {"title": "Полтинник треков",      "description": "Прослушай 50 треков",                      "quest_type": "listen_tracks",  "target_value": 50, "ecoin_reward": 50, "difficulty": "hard"},
    {"title": "Знаток жанров",         "description": "Прослушай треки 8 разных жанров",          "quest_type": "listen_genres",  "target_value": 8,  "ecoin_reward": 45, "difficulty": "hard"},
    {"title": "Рок-легенда",           "description": "Прослушай 20 рок-треков",                  "quest_type": "listen_genre",   "target_value": 20, "target_ref": "rock", "ecoin_reward": 55, "difficulty": "hard"},
    {"title": "Электронный мастер",    "description": "Прослушай 20 электронных треков",          "quest_type": "listen_genre",   "target_value": 20, "target_ref": "electronic","ecoin_reward": 55,"difficulty": "hard"},
    {"title": "Сотня лайков",          "description": "Лайкни 100 треков (за всё время)",         "quest_type": "like_tracks",    "target_value": 100,"ecoin_reward": 80, "difficulty": "hard"},
    {"title": "Большой плейлист",      "description": "Добавь 20 треков в плейлист",              "quest_type": "playlist_tracks","target_value": 20, "ecoin_reward": 50, "difficulty": "hard"},
    {"title": "Три дня слушателя",     "description": "Слушай музыку 3 дня подряд",               "quest_type": "listen_days",    "target_value": 3,  "ecoin_reward": 70, "difficulty": "hard"},
    {"title": "Нон-стоп 8 часов",      "description": "Слушай музыку 8 часов",                    "quest_type": "listen_minutes", "target_value": 480,"ecoin_reward": 90, "difficulty": "hard"},
    {"title": "Сотня треков",          "description": "Прослушай 100 треков",                     "quest_type": "listen_tracks",  "target_value": 100,"ecoin_reward": 80, "difficulty": "hard"},
    {"title": "Все жанры",             "description": "Прослушай треки всех жанров сервиса",      "quest_type": "listen_all_genres","target_value": 1, "ecoin_reward": 100,"difficulty": "hard"},
    {"title": "Новатор",               "description": "Прослушай 5 новых исполнителей",           "quest_type": "listen_new_artists","target_value": 5,"ecoin_reward": 60, "difficulty": "hard"},
    {"title": "Утро+День+Вечер",       "description": "Слушай музыку утром, днём и вечером",      "quest_type": "listen_all_day", "target_value": 1,  "ecoin_reward": 55, "difficulty": "hard"},
    {"title": "Металлург",             "description": "Прослушай 15 метал-треков",                "quest_type": "listen_genre",   "target_value": 15, "target_ref": "metal","ecoin_reward": 55,"difficulty": "hard"},
    {"title": "Джазмен",               "description": "Прослушай 15 джазовых треков",             "quest_type": "listen_genre",   "target_value": 15, "target_ref": "jazz", "ecoin_reward": 55,"difficulty": "hard"},
    {"title": "R&B адепт",             "description": "Прослушай 15 R&B треков",                  "quest_type": "listen_genre",   "target_value": 15, "target_ref": "rnb",  "ecoin_reward": 55,"difficulty": "hard"},
    {"title": "Коллекционер",          "description": "Купи 3 предмета в магазине",               "quest_type": "buy_items",      "target_value": 3,  "ecoin_reward": 80, "difficulty": "hard"},
    {"title": "Квестовый марафон",     "description": "Выполни 10 квестов за месяц",              "quest_type": "complete_quests","target_value": 10, "ecoin_reward": 100,"difficulty": "hard"},
    {"title": "Фанат альбомов",        "description": "Прослушай полный альбом",                  "quest_type": "listen_album",   "target_value": 1,  "ecoin_reward": 40, "difficulty": "hard"},
    {"title": "Многоплейлистник",      "description": "Создай 3 плейлиста",                       "quest_type": "add_playlist",   "target_value": 3,  "ecoin_reward": 45, "difficulty": "hard"},
    {"title": "Преданный слушатель",   "description": "Слушай музыку 7 дней подряд",              "quest_type": "listen_days",    "target_value": 7,  "ecoin_reward": 120,"difficulty": "hard"},
    {"title": "Латинский ритм",        "description": "Прослушай 10 латиноамериканских треков",   "quest_type": "listen_genre",   "target_value": 10, "target_ref": "latin","ecoin_reward": 50,"difficulty": "hard"},
    {"title": "Кантри-вечер",          "description": "Прослушай 10 кантри треков",               "quest_type": "listen_genre",   "target_value": 10, "target_ref": "country","ecoin_reward":50,"difficulty": "hard"},
    {"title": "Душа акустики",         "description": "Прослушай 10 акустических треков",         "quest_type": "listen_genre",   "target_value": 10, "target_ref": "acoustic","ecoin_reward":50,"difficulty": "hard"},
    {"title": "Мастер плейлистов",     "description": "Добавь 50 треков в плейлисты",             "quest_type": "playlist_tracks","target_value": 50, "ecoin_reward": 90, "difficulty": "hard"},
]

def _seed_shop_and_quests(db: Session):
    try:
        if db.query(models.ShopItem).count() == 0:
            for item in DEFAULT_SHOP_ITEMS:
                db.add(models.ShopItem(**item))
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"[seed] shop_items table not ready yet: {e}")
        return

    try:
        if db.query(models.Quest).count() == 0:
            for q in DEFAULT_QUESTS:
                db.add(models.Quest(**q))
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"[seed] quests table not ready yet: {e}")

# ──────────────────────────────────────────────────────────────
# Прогресс / уровень
# ──────────────────────────────────────────────────────────────

@router.get("/progress")
def get_my_progress(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    p = _get_or_create_progress(db, current_user.id)
    level = _level_from_seconds(p.total_listen_seconds)
    current_level_start = _seconds_for_level(level)
    next_level_start = _seconds_for_level(level + 1)
    progress_in_level = p.total_listen_seconds - current_level_start
    level_duration = next_level_start - current_level_start
    return {
        "level": level,
        "ecoins": p.ecoins,
        "total_listen_seconds": p.total_listen_seconds,
        "total_listen_hours": round(p.total_listen_seconds / 3600, 2),
        "level_progress_seconds": progress_in_level,
        "level_duration_seconds": level_duration,
        "level_progress_pct": round(progress_in_level / level_duration * 100, 1),
    }


@router.post("/progress/add-listen-time")
def add_listen_time(
    seconds: int,
    genre: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    """Добавить время прослушивания (вызывается с фронта по окончании трека)."""
    if seconds <= 0 or seconds > 3600:
        raise HTTPException(400, "Недопустимое значение секунд")
    p = _get_or_create_progress(db, current_user.id)
    old_level = _level_from_seconds(p.total_listen_seconds)
    p.total_listen_seconds += seconds
    new_level = _level_from_seconds(p.total_listen_seconds)
    p.level = new_level
    db.commit()

    # ── Auto-update daily quest progress ──────────────────────
    today = _today()
    daily_quests = db.query(models.UserDailyQuest).filter_by(
        user_id=current_user.id, date=today, claimed=False
    ).all()

    minutes_listened = seconds // 60

    for dq in daily_quests:
        if dq.completed:
            continue
        qt = dq.quest.quest_type
        updated = False

        if qt == 'listen_tracks':
            dq.progress = min(dq.progress + 1, dq.quest.target_value)
            updated = True
        elif qt == 'listen_minutes' and minutes_listened > 0:
            dq.progress = min(dq.progress + minutes_listened, dq.quest.target_value)
            updated = True
        elif qt == 'listen_genre' and genre and dq.quest.target_ref:
            if genre.lower() == dq.quest.target_ref.lower():
                dq.progress = min(dq.progress + 1, dq.quest.target_value)
                updated = True

        if updated and dq.progress >= dq.quest.target_value:
            dq.completed = True

    db.commit()

    return {
        "level": new_level,
        "leveled_up": new_level > old_level,
        "total_listen_seconds": p.total_listen_seconds,
    }

# ──────────────────────────────────────────────────────────────
# Квесты
# ──────────────────────────────────────────────────────────────

@router.get("/quests/daily")
def get_daily_quests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    _seed_shop_and_quests(db)
    today = _today()
    quests = db.query(models.UserDailyQuest).filter_by(user_id=current_user.id, date=today).all()
    if not quests:
        # Выдаём 3 случайных квеста
        all_quests = db.query(models.Quest).all()
        chosen = random.sample(all_quests, min(3, len(all_quests)))
        for q in chosen:
            dq = models.UserDailyQuest(user_id=current_user.id, quest_id=q.id, date=today)
            db.add(dq)
        db.commit()
        quests = db.query(models.UserDailyQuest).filter_by(user_id=current_user.id, date=today).all()

    return [
        {
            "id": dq.id,
            "quest_id": dq.quest_id,
            "title": dq.quest.title,
            "description": dq.quest.description,
            "quest_type": dq.quest.quest_type,
            "target_value": dq.quest.target_value,
            "ecoin_reward": dq.quest.ecoin_reward,
            "difficulty": dq.quest.difficulty,
            "progress": dq.progress,
            "completed": dq.completed,
            "claimed": dq.claimed,
            "date": dq.date,
        }
        for dq in quests
    ]


@router.post("/quests/{daily_quest_id}/claim")
def claim_quest_reward(
    daily_quest_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    dq = db.query(models.UserDailyQuest).filter_by(id=daily_quest_id, user_id=current_user.id).first()
    if not dq:
        raise HTTPException(404, "Квест не найден")
    if not dq.completed:
        raise HTTPException(400, "Квест ещё не выполнен")
    if dq.claimed:
        raise HTTPException(400, "Награда уже получена")
    dq.claimed = True
    p = _get_or_create_progress(db, current_user.id)
    p.ecoins += dq.quest.ecoin_reward
    db.commit()
    return {"ecoins_earned": dq.quest.ecoin_reward, "total_ecoins": p.ecoins}


@router.post("/quests/{daily_quest_id}/update-progress")
def update_quest_progress(
    daily_quest_id: int,
    progress: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    dq = db.query(models.UserDailyQuest).filter_by(id=daily_quest_id, user_id=current_user.id).first()
    if not dq:
        raise HTTPException(404, "Квест не найден")
    dq.progress = min(progress, dq.quest.target_value)
    if dq.progress >= dq.quest.target_value:
        dq.completed = True
    db.commit()
    return {"progress": dq.progress, "completed": dq.completed}

# ──────────────────────────────────────────────────────────────
# Магазин
# ──────────────────────────────────────────────────────────────

@router.get("/shop")
def get_shop_items(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    _seed_shop_and_quests(db)
    p = _get_or_create_progress(db, current_user.id)
    level = _level_from_seconds(p.total_listen_seconds)
    items = db.query(models.ShopItem).all()
    owned_ids = {inv.item_id for inv in db.query(models.UserInventory).filter_by(user_id=current_user.id).all()}
    return [
        {
            "id": item.id,
            "name": item.name,
            "description": item.description,
            "item_type": item.item_type,
            "value": item.value,
            "price": item.price,
            "rarity": item.rarity,
            "unlock_level": item.unlock_level,
            "preview_css": item.preview_css,
            "owned": item.id in owned_ids,
            "available": level >= item.unlock_level,
        }
        for item in items
    ]


@router.post("/shop/{item_id}/buy")
def buy_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    item = db.query(models.ShopItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(404, "Предмет не найден")
    already = db.query(models.UserInventory).filter_by(user_id=current_user.id, item_id=item_id).first()
    if already:
        raise HTTPException(400, "Предмет уже куплен")
    p = _get_or_create_progress(db, current_user.id)
    if p.ecoins < item.price:
        raise HTTPException(400, f"Недостаточно Ecoins. Нужно {item.price}, есть {p.ecoins}")
    p.ecoins -= item.price
    inv = models.UserInventory(user_id=current_user.id, item_id=item_id)
    db.add(inv)
    db.commit()
    return {"success": True, "remaining_ecoins": p.ecoins}

# ──────────────────────────────────────────────────────────────
# Инвентарь
# ──────────────────────────────────────────────────────────────

@router.get("/inventory")
def get_inventory(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    items = db.query(models.UserInventory).filter_by(user_id=current_user.id).all()
    return [
        {
            "id": inv.id,
            "item_id": inv.item.id,
            "name": inv.item.name,
            "item_type": inv.item.item_type,
            "value": inv.item.value,
            "rarity": inv.item.rarity,
            "preview_css": inv.item.preview_css,
            "is_equipped": inv.is_equipped,
            "acquired_at": inv.acquired_at.isoformat() if inv.acquired_at else None,
        }
        for inv in items
    ]


@router.post("/inventory/{inv_id}/equip")
def equip_item(
    inv_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    inv = db.query(models.UserInventory).filter_by(id=inv_id, user_id=current_user.id).first()
    if not inv:
        raise HTTPException(404, "Предмет не найден в инвентаре")
    # Снимаем другие предметы того же типа
    same_type = db.query(models.UserInventory).join(models.ShopItem).filter(
        models.UserInventory.user_id == current_user.id,
        models.ShopItem.item_type == inv.item.item_type
    ).all()
    for other in same_type:
        other.is_equipped = False
    inv.is_equipped = True
    db.commit()
    return {"equipped": True, "item_type": inv.item.item_type, "value": inv.item.value}


@router.post("/inventory/{inv_id}/unequip")
def unequip_item(
    inv_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    inv = db.query(models.UserInventory).filter_by(id=inv_id, user_id=current_user.id).first()
    if not inv:
        raise HTTPException(404, "Предмет не найден в инвентаре")
    inv.is_equipped = False
    db.commit()
    return {"unequipped": True}


@router.get("/equipped")
def get_equipped_items(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    """Возвращает активно надетые предметы пользователя."""
    items = db.query(models.UserInventory).filter_by(user_id=current_user.id, is_equipped=True).all()
    return {inv.item.item_type: inv.item.value for inv in items}

# ──────────────────────────────────────────────────────────────
# Достижения
# ──────────────────────────────────────────────────────────────

@router.get("/achievements")
def get_achievements(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    achievements = db.query(models.UserAchievement).filter_by(user_id=current_user.id).all()
    return [{"key": a.achievement_key, "achieved_at": a.achieved_at.isoformat()} for a in achievements]

# ──────────────────────────────────────────────────────────────
# Публичный профиль (для отображения рамки/ника других)
# ──────────────────────────────────────────────────────────────

@router.get("/user/{user_id}/equipped")
def get_user_equipped(user_id: int, db: Session = Depends(get_db)):
    items = db.query(models.UserInventory).filter_by(user_id=user_id, is_equipped=True).all()
    return {inv.item.item_type: inv.item.value for inv in items}

# ──────────────────────────────────────────────────────────────
# Админ: изменить Ecoins / уровень пользователя
# ──────────────────────────────────────────────────────────────

@router.put("/admin/user/{user_id}/ecoins")
def admin_set_ecoins(
    user_id: int,
    amount: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(403, "Только для администраторов")
    p = _get_or_create_progress(db, user_id)
    p.ecoins = amount
    db.commit()
    return {"user_id": user_id, "ecoins": p.ecoins}


@router.put("/admin/user/{user_id}/level")
def admin_set_level(
    user_id: int,
    level: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(403, "Только для администраторов")
    if level < 1:
        raise HTTPException(400, "Уровень должен быть >= 1")
    p = _get_or_create_progress(db, user_id)
    p.level = level
    p.total_listen_seconds = _seconds_for_level(level)
    db.commit()
    return {"user_id": user_id, "level": p.level, "total_listen_seconds": p.total_listen_seconds}


# ──────────────────────────────────────────────────────────────
# Админ: получить прогресс конкретного пользователя
# ──────────────────────────────────────────────────────────────

@router.get("/admin/user/{user_id}/progress")
def admin_get_user_progress(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(403, "Только для администраторов")
    p = _get_or_create_progress(db, user_id)
    level = _level_from_seconds(p.total_listen_seconds)
    current_level_start = _seconds_for_level(level)
    next_level_start = _seconds_for_level(level + 1)
    progress_in_level = p.total_listen_seconds - current_level_start
    level_duration = next_level_start - current_level_start
    return {
        "user_id": user_id,
        "level": level,
        "ecoins": p.ecoins,
        "total_listen_seconds": p.total_listen_seconds,
        "total_listen_hours": round(p.total_listen_seconds / 3600, 2),
        "level_progress_pct": round((progress_in_level / level_duration) * 100, 1) if level_duration else 100,
        "seconds_to_next_level": max(0, next_level_start - p.total_listen_seconds),
    }


# ──────────────────────────────────────────────────────────────
# Админ: CRUD квестов
# ──────────────────────────────────────────────────────────────

@router.get("/admin/quests")
def admin_get_quests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(403, "Только для администраторов")
    _seed_shop_and_quests(db)
    quests = db.query(models.Quest).all()
    return [
        {
            "id": q.id,
            "title": q.title,
            "description": q.description,
            "quest_type": q.quest_type,
            "target_value": q.target_value,
            "target_ref": q.target_ref,
            "ecoin_reward": q.ecoin_reward,
            "difficulty": q.difficulty,
        }
        for q in quests
    ]


@router.post("/admin/quests")
def admin_create_quest(
    title: str,
    description: str,
    quest_type: str,
    target_value: int,
    ecoin_reward: int,
    difficulty: str = "easy",
    target_ref: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(403, "Только для администраторов")
    q = models.Quest(
        title=title,
        description=description,
        quest_type=quest_type,
        target_value=target_value,
        ecoin_reward=ecoin_reward,
        difficulty=difficulty,
        target_ref=target_ref,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return {"id": q.id, "title": q.title}


@router.put("/admin/quests/{quest_id}")
def admin_update_quest(
    quest_id: int,
    title: str = None,
    description: str = None,
    ecoin_reward: int = None,
    difficulty: str = None,
    target_value: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(403, "Только для администраторов")
    q = db.query(models.Quest).filter_by(id=quest_id).first()
    if not q:
        raise HTTPException(404, "Квест не найден")
    if title is not None: q.title = title
    if description is not None: q.description = description
    if ecoin_reward is not None: q.ecoin_reward = ecoin_reward
    if difficulty is not None: q.difficulty = difficulty
    if target_value is not None: q.target_value = target_value
    db.commit()
    return {"id": q.id, "title": q.title, "ecoin_reward": q.ecoin_reward}


@router.delete("/admin/quests/{quest_id}")
def admin_delete_quest(
    quest_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(403, "Только для администраторов")
    q = db.query(models.Quest).filter_by(id=quest_id).first()
    if not q:
        raise HTTPException(404, "Квест не найден")
    db.delete(q)
    db.commit()
    return {"deleted": True}


# ──────────────────────────────────────────────────────────────
# Админ: CRUD предметов магазина
# ──────────────────────────────────────────────────────────────

@router.get("/admin/shop-items")
def admin_get_shop_items(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(403, "Только для администраторов")
    _seed_shop_and_quests(db)
    items = db.query(models.ShopItem).all()
    return [
        {
            "id": i.id,
            "name": i.name,
            "description": i.description,
            "item_type": i.item_type,
            "value": i.value,
            "price": i.price,
            "rarity": i.rarity,
            "unlock_level": i.unlock_level,
        }
        for i in items
    ]


@router.post("/admin/shop-items")
def admin_create_shop_item(
    name: str,
    description: str,
    item_type: str,
    value: str,
    price: int,
    rarity: str = "common",
    unlock_level: int = 0,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(403, "Только для администраторов")
    item = models.ShopItem(
        name=name, description=description, item_type=item_type,
        value=value, price=price, rarity=rarity, unlock_level=unlock_level,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "name": item.name}


@router.delete("/admin/shop-items/{item_id}")
def admin_delete_shop_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(403, "Только для администраторов")
    item = db.query(models.ShopItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(404, "Предмет не найден")
    db.delete(item)
    db.commit()
    return {"deleted": True}


# ──────────────────────────────────────────────────────────────
# Принудительный пересев данных (квесты + магазин)
# ──────────────────────────────────────────────────────────────

@router.post("/admin/seed")
def admin_force_seed(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    """Пересоздаёт стандартные квесты и предметы магазина, если их нет."""
    if current_user.role != "admin":
        raise HTTPException(403, "Только для администраторов")
    _seed_shop_and_quests(db)
    return {
        "quests": db.query(models.Quest).count(),
        "shop_items": db.query(models.ShopItem).count(),
    }


@router.post("/admin/reseed")
def admin_reseed(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    """Удаляет ВСЕ квесты и предметы магазина (кроме тех что в инвентарях) и создаёт стандартные заново."""
    if current_user.role != "admin":
        raise HTTPException(403, "Только для администраторов")
    # Clear daily quests first
    db.query(models.UserDailyQuest).delete()
    # Clear inventory before deleting shop items
    db.query(models.UserInventory).delete()
    db.query(models.ShopItem).delete()
    db.query(models.Quest).delete()
    db.commit()
    _seed_shop_and_quests(db)
    return {
        "quests": db.query(models.Quest).count(),
        "shop_items": db.query(models.ShopItem).count(),
        "message": "Данные успешно пересозданы (инвентари пользователей очищены)"
    }
