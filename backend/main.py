from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import users, artists, music, favorites, submissions, admin, albums, playlists

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

@app.get("/")
def root():
    return {"message": "Music App API"}