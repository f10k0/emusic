from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, Table, Text, BigInteger
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

# Таблица для связи плейлистов и треков
playlist_tracks = Table(
    'playlist_tracks',
    Base.metadata,
    Column('playlist_id', Integer, ForeignKey('playlists.id', ondelete='CASCADE')),
    Column('track_id', Integer, ForeignKey('tracks.id', ondelete='CASCADE'))
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

    favorite_tracks = relationship('Track', secondary=favorite_tracks, backref='favorited_by')
    favorite_albums = relationship('Album', secondary=favorite_albums, backref='favorited_by')
    favorite_artists = relationship('Artist', secondary=favorite_artists, backref='favorited_by')
    artist = relationship('Artist', back_populates='user', uselist=False)
    playlists = relationship('Playlist', back_populates='user', cascade='all, delete-orphan')


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

    album = relationship('Album', back_populates='tracks')
    artist = relationship('Artist', back_populates='tracks')
    submissions = relationship('Submission', back_populates='track')

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