import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import usePlayerStore from '../../store/playerStore';
import LikeButton from '../../components/LikeButton';
import DownloadButton from '../../components/DownloadButton';
import AddToPlaylistButton from '../../components/AddToPlaylistButton';
import Link from 'next/link';

export default function ArtistPage() {
  const router = useRouter();
  const { id } = router.query;
  const [artist, setArtist] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [tracks, setTracks] = useState([]);
  const { setTrack, updateQueue } = usePlayerStore();

  useEffect(() => {
    if (id) {
      api.get(`/artists/${id}`)
        .then(res => {
          setArtist(res.data.artist);
          setAlbums(res.data.albums || []);
          setTracks(res.data.tracks || []);
          updateQueue(res.data.tracks || []);
        })
        .catch(err => console.error('Ошибка загрузки артиста:', err));
    }
  }, [id]);

  const handlePlayTrack = (track) => {
    setTrack(track, tracks);
  };

  const handleArtistLikeToggle = (newState) => {
    setArtist(prev => ({ ...prev, liked: newState }));
  };

  if (!artist) return <Layout>Загрузка...</Layout>;

  return (
    <Layout>
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            <img 
              src={artist.avatar ? `${process.env.NEXT_PUBLIC_API_URL}/${artist.avatar}` : '/default-avatar.png'} 
              alt={artist.name}
              onError={(e) => { e.target.src = '/default-avatar.png'; }}
            />
          </div>
          <div className="profile-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
              <h2 className="artist-name">{artist.name}</h2>
              <div className="artist-like-button">
                <LikeButton 
                  item={artist} 
                  type="artists" 
                  initialState={artist.liked} 
                  onToggle={handleArtistLikeToggle}
                />
              </div>
            </div>
            <p>{artist.bio || 'Нет описания'}</p>
            <div className="profile-stats">
              <div className="stat">
                <span className="stat-value">{tracks.length}</span>
                <span className="stat-label">треков</span>
              </div>
              <div className="stat">
                <span className="stat-value">{albums.length}</span>
                <span className="stat-label">альбомов</span>
              </div>
            </div>
          </div>
        </div>

        {albums.length > 0 && (
          <div className="section">
            <h2>Альбомы</h2>
            <div className="card-grid">
              {albums.map(album => (
                <div key={album.id} className="card" style={{ position: 'relative' }}>
                  <Link href={`/album/${album.id}`}>
                    <div className="card-image">
                      <img 
                        src={album.cover_image ? `${process.env.NEXT_PUBLIC_API_URL}/${album.cover_image}` : '/default-cover.png'} 
                        alt={album.title}
                        onError={(e) => { e.target.src = '/default-cover.png'; }}
                      />
                    </div>
                    <div className="card-title">{album.title}</div>
                    <div className="card-sub">{album.release_date ? new Date(album.release_date).getFullYear() : ''}</div>
                  </Link>
                  <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
                    <LikeButton item={album} type="albums" initialState={album.liked} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="section">
          <h2>Треки</h2>
          <div className="track-list">
            {tracks.map(track => (
              <div key={track.id} className="track-item">
                <div className="track-info" onClick={() => handlePlayTrack(track)}>
                  <span className="track-number">▶</span>
                  <img 
                    src={track.cover ? `${process.env.NEXT_PUBLIC_API_URL}/${track.cover}` : '/default-cover.png'} 
                    className="track-thumb" 
                    alt={track.title}
                    onError={(e) => { e.target.src = '/default-cover.png'; }}
                  />
                  <div>
                    <div className="track-name">{track.title}</div>
                    <div className="track-artist">
                      <Link href={`/artist/${artist.id}`}>{artist.name}</Link>
                    </div>
                    <div className="track-play-count">
                      <i className="fas fa-headphones"></i> {track.play_count || 0}
                    </div>
                  </div>
                </div>
                <div className="track-actions">
                  <LikeButton item={track} type="tracks" initialState={track.liked} />
                  <DownloadButton trackId={track.id} trackTitle={track.title} />
                  <AddToPlaylistButton trackId={track.id} trackTitle={track.title} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}