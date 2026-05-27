from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import users, artists, music, favorites, submissions, admin, albums, playlists, genres, news
from routers import videos, events, moods, gamification

app = FastAPI(title="Music App API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(users.router)
app.include_router(artists.router)
app.include_router(music.router)
app.include_router(favorites.router)
app.include_router(submissions.router)
app.include_router(admin.router)
app.include_router(albums.router)
app.include_router(playlists.router)
app.include_router(genres.router)
app.include_router(news.router)
app.include_router(videos.router)
app.include_router(events.router)
app.include_router(moods.router)
app.include_router(gamification.router)


@app.on_event("startup")
def on_startup():
    """
    On startup: create any missing tables (including gamification tables)
    and seed default shop items + quests if not already present.
    """
    try:
        from database import engine, Base
        import models  # noqa – registers all ORM models with Base
        Base.metadata.create_all(bind=engine)
        print("[startup] Database tables verified/created via SQLAlchemy.")
    except Exception as e:
        print(f"[startup] WARNING: Could not create tables: {e}")

    # Seed genres
    try:
        from init_genres import add_genres
        add_genres()
        print("[startup] Genres seeded.")
    except Exception as e:
        print(f"[startup] WARNING: Could not seed genres: {e}")

    # Seed default gamification data
    try:
        from database import SessionLocal
        from routers.gamification import _seed_shop_and_quests
        db = SessionLocal()
        try:
            _seed_shop_and_quests(db)
            print("[startup] Gamification seed complete.")
        finally:
            db.close()
    except Exception as e:
        print(f"[startup] WARNING: Could not seed gamification data: {e}")


@app.get("/")
def root():
    return {"message": "Music App API"}
