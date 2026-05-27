from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, Table, Text, BigInteger, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

# Таблицы для избранного
favorite_tracks = Table(
    'favorite_tracks',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('track_id', Integer, ForeignKey('tracks.id'))
)

favorite_albums = Table(
    'favorite_albums',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('album_id', Integer, ForeignKey('albums.id'))
)

favorite_artists = Table(
    'favorite_artists',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('artist_id', Integer, ForeignKey('artists.id'))
)

playlist_tracks = Table(
    'playlist_tracks',
    Base.metadata,
    Column('playlist_id', Integer, ForeignKey('playlists.id', ondelete='CASCADE')),
    Column('track_id', Integer, ForeignKey('tracks.id', ondelete='CASCADE'))
)

track_genres = Table(
    'track_genres',
    Base.metadata,
    Column('track_id', Integer, ForeignKey('tracks.id', ondelete='CASCADE')),
    Column('genre_id', Integer, ForeignKey('genres.id', ondelete='CASCADE'))
)

track_moods = Table(
    'track_moods',
    Base.metadata,
    Column('track_id', Integer, ForeignKey('tracks.id', ondelete='CASCADE')),
    Column('mood_id', Integer, ForeignKey('moods.id', ondelete='CASCADE'))
)


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default='user')
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    avatar = Column(String, nullable=True)
    settings = Column(JSON, nullable=True)

    favorite_tracks = relationship('Track', secondary=favorite_tracks, backref='favorited_by')
    favorite_albums = relationship('Album', secondary=favorite_albums, backref='favorited_by')
    favorite_artists = relationship('Artist', secondary=favorite_artists, backref='favorited_by')
    artist = relationship('Artist', back_populates='user', uselist=False)
    playlists = relationship('Playlist', back_populates='user', cascade='all, delete-orphan')
    listening_history = relationship('ListeningHistory', back_populates='user', cascade='all, delete-orphan')


class Artist(Base):
    __tablename__ = 'artists'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    bio = Column(Text)
    avatar = Column(String)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True, nullable=False)

    user = relationship('User', back_populates='artist')
    albums = relationship('Album', back_populates='artist')
    tracks = relationship('Track', back_populates='artist')
    submissions = relationship('Submission', back_populates='artist')
    videos = relationship('Video', back_populates='artist', cascade='all, delete-orphan')
    events = relationship('Event', back_populates='artist', cascade='all, delete-orphan')


class Album(Base):
    __tablename__ = 'albums'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    artist_id = Column(Integer, ForeignKey('artists.id'), nullable=False)
    release_date = Column(DateTime)
    cover_image = Column(String)
    type = Column(String)
    is_published = Column(Boolean, default=False)

    artist = relationship('Artist', back_populates='albums')
    tracks = relationship('Track', back_populates='album')


class Mood(Base):
    __tablename__ = 'moods'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    emoji = Column(String, nullable=True)

    tracks = relationship('Track', secondary=track_moods, back_populates='moods')


class Track(Base):
    __tablename__ = 'tracks'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    duration = Column(Integer)
    album_id = Column(Integer, ForeignKey('albums.id'), nullable=True)
    artist_id = Column(Integer, ForeignKey('artists.id'), nullable=False)
    file_path = Column(String, nullable=False)
    cover = Column(String, nullable=True)
    play_count = Column(BigInteger, default=0)
    is_published = Column(Boolean, default=False)
    is_adult = Column(Boolean, default=False)
    lyrics = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    album = relationship('Album', back_populates='tracks')
    artist = relationship('Artist', back_populates='tracks')
    submissions = relationship('Submission', back_populates='track')
    genres = relationship('Genre', secondary=track_genres, back_populates='tracks')
    moods = relationship('Mood', secondary=track_moods, back_populates='tracks')
    listening_history = relationship('ListeningHistory', back_populates='track', cascade='all, delete-orphan')

    @property
    def artist_name(self):
        return self.artist.name if self.artist else None


class Submission(Base):
    __tablename__ = 'submissions'

    id = Column(Integer, primary_key=True, index=True)
    artist_id = Column(Integer, ForeignKey('artists.id'), nullable=False)
    track_id = Column(Integer, ForeignKey('tracks.id'), nullable=False)
    status = Column(String, default='pending')
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    artist = relationship('Artist', back_populates='submissions')
    track = relationship('Track', back_populates='submissions')


class Playlist(Base):
    __tablename__ = 'playlists'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    cover_image = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship('User', back_populates='playlists')
    tracks = relationship('Track', secondary=playlist_tracks, backref='playlists')


class News(Base):
    __tablename__ = 'news'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    image = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_published = Column(Boolean, default=True)


class Genre(Base):
    __tablename__ = 'genres'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    cover_image = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tracks = relationship('Track', secondary=track_genres, back_populates='genres')


class Video(Base):
    __tablename__ = 'videos'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    file_path = Column(String, nullable=False)
    artist_id = Column(Integer, ForeignKey('artists.id'), nullable=False)
    duration = Column(Integer, nullable=True)
    play_count = Column(BigInteger, default=0)
    likes = Column(Integer, default=0)
    dislikes = Column(Integer, default=0)
    is_published = Column(Boolean, default=True)
    hidden_by_admin = Column(Boolean, default=False)  # True = скрыто администратором, артист не может разскрыть
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    artist = relationship('Artist', back_populates='videos')
    comments = relationship('VideoComment', back_populates='video', cascade='all, delete-orphan')


class VideoComment(Base):
    __tablename__ = 'video_comments'

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey('videos.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    parent_id = Column(Integer, ForeignKey('video_comments.id'), nullable=True)
    content = Column(Text, nullable=False)
    likes = Column(Integer, default=0)
    dislikes = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    video = relationship('Video', back_populates='comments')
    user = relationship('User')
    # replies loaded manually via query in router


class VideoLike(Base):
    __tablename__ = 'video_likes'

    user_id  = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True, nullable=False)
    video_id = Column(Integer, ForeignKey('videos.id', ondelete='CASCADE'), primary_key=True, nullable=False)

    user  = relationship('User')
    video = relationship('Video')


class VideoDislike(Base):
    __tablename__ = 'video_dislikes'

    user_id  = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True, nullable=False)
    video_id = Column(Integer, ForeignKey('videos.id', ondelete='CASCADE'), primary_key=True, nullable=False)

    user  = relationship('User')
    video = relationship('Video')


class VideoCommentLike(Base):
    __tablename__ = 'video_comment_likes'

    user_id    = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True, nullable=False)
    comment_id = Column(Integer, ForeignKey('video_comments.id', ondelete='CASCADE'), primary_key=True, nullable=False)

    user    = relationship('User')
    comment = relationship('VideoComment')


class Event(Base):
    __tablename__ = 'events'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    date = Column(DateTime(timezone=True), nullable=False)
    location = Column(String, nullable=True)
    tickets_url = Column(String, nullable=True)
    image = Column(String, nullable=True)
    artist_id = Column(Integer, ForeignKey('artists.id'), nullable=False)
    is_published = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    artist = relationship('Artist', back_populates='events')


class ListeningHistory(Base):
    __tablename__ = 'listening_history'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    track_id = Column(Integer, ForeignKey('tracks.id', ondelete='CASCADE'), nullable=False)
    listened_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship('User', back_populates='listening_history')
    track = relationship('Track', back_populates='listening_history')


# ─────────────────────────────────────────────────────────────
# Система уровней, достижений, квестов, магазина
# ─────────────────────────────────────────────────────────────

class UserProgress(Base):
    """Прогресс пользователя: уровень, Ecoins, время прослушивания."""
    __tablename__ = 'user_progress'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    level = Column(Integer, default=1)
    ecoins = Column(Integer, default=0)
    total_listen_seconds = Column(Integer, default=0)  # накопленное время в секундах
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship('User', backref='progress', uselist=False)


class ShopItem(Base):
    """Предмет в магазине внешнего вида."""
    __tablename__ = 'shop_items'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    item_type = Column(String, nullable=False)   # avatar_frame | bg | theme | nickname_color | badge
    value = Column(String, nullable=False)        # CSS-класс, цвет, ключ темы и т.д.
    price = Column(Integer, nullable=False)       # в Ecoins
    rarity = Column(String, default='common')    # common | rare | epic | legendary
    unlock_level = Column(Integer, default=0)    # минимальный уровень для показа в магазине
    preview_css = Column(Text, nullable=True)    # инлайн CSS для превью
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserInventory(Base):
    """Инвентарь пользователя — купленные/полученные предметы."""
    __tablename__ = 'user_inventory'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    item_id = Column(Integer, ForeignKey('shop_items.id', ondelete='CASCADE'), nullable=False)
    acquired_at = Column(DateTime(timezone=True), server_default=func.now())
    is_equipped = Column(Boolean, default=False)

    user = relationship('User', backref='inventory')
    item = relationship('ShopItem')


class Quest(Base):
    """Определение квеста."""
    __tablename__ = 'quests'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    quest_type = Column(String, nullable=False)
    # listen_minutes | listen_tracks | listen_artist | like_tracks |
    # add_playlist | listen_genre | complete_daily | ...
    target_value = Column(Integer, default=1)    # сколько нужно сделать
    target_ref = Column(String, nullable=True)   # artist_id / genre_slug и т.д.
    ecoin_reward = Column(Integer, default=10)
    difficulty = Column(String, default='easy')  # easy | medium | hard


class UserDailyQuest(Base):
    """Ежедневные квесты конкретного пользователя."""
    __tablename__ = 'user_daily_quests'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    quest_id = Column(Integer, ForeignKey('quests.id', ondelete='CASCADE'), nullable=False)
    date = Column(String, nullable=False)   # YYYY-MM-DD
    progress = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    claimed = Column(Boolean, default=False)

    user = relationship('User', backref='daily_quests')
    quest = relationship('Quest')


class UserAchievement(Base):
    """Постоянные достижения пользователя."""
    __tablename__ = 'user_achievements'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    achievement_key = Column(String, nullable=False)  # уникальный ключ достижения
    achieved_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship('User', backref='achievements')
