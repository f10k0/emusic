import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import usePlayerStore from '../../store/playerStore';
import LikeButton from '../../components/LikeButton';
import DownloadButton from '../../components/DownloadButton';
import Link from 'next/link';

export default function PlaylistDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuthStore();
  const { setTrack } = usePlayerStore();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPlaylist();
    }
  }, [id]);

  useEffect(() => {
    if (playlist && user) {
      setIsOwner(playlist.user_id === user.id);
    }
  }, [playlist, user]);

  const fetchPlaylist = async () => {
    try {
      const res = await api.get(`/playlists/${id}`);
      setPlaylist(res.data);
    } catch (err) {
      console.error('Ошибка загрузки плейлиста:', err);
      if (err.response?.status === 403) {
        alert('Этот плейлист приватный');
        router.push('/playlists');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePlayTrack = (track) => {
    setTrack(track, playlist.tracks);
  };

  const handleRemoveTrack = async (trackId) => {
    if (!isOwner) return;
    try {
      await api.delete(`/playlists/${id}/tracks/${trackId}`);
      fetchPlaylist();
    } catch (err) {
      console.error('Ошибка удаления трека:', err);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: 'var(--accent)' }}></i>
        </div>
      </Layout>
    );
  }

  if (!playlist) {
    return (
      <Layout>
        <div className="form-container">
          <h2>Плейлист не найден</h2>
          <Link href="/playlists" className="btn">Вернуться к плейлистам</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="playlist-hero">
        <div className="playlist-cover">
          <img 
            src={playlist.cover_image ? `${process.env.NEXT_PUBLIC_API_URL}/${playlist.cover_image}` : '/default-playlist.png'} 
            alt={playlist.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '30px' }}
            onError={(e) => { e.target.src = '/default-playlist.png'; }}
          />
        </div>
        <div className="playlist-info">
          <div className="playlist-badge">Плейлист</div>
          <h2>{playlist.name}</h2>
          <p className="playlist-desc">{playlist.description}</p>
          <div className="playlist-stats">
            Создан: {new Date(playlist.created_at).toLocaleDateString('ru-RU')} • 
            {playlist.tracks?.length || 0} треков • 
            {playlist.is_public ? 'Публичный' : 'Приватный'}
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Треки</h2>
        {(!playlist.tracks || playlist.tracks.length === 0) ? (
          <p>В этом плейлисте пока нет треков</p>
        ) : (
          <div className="track-list">
            {playlist.tracks.map((track, index) => (
              <div key={track.id} className="track-item">
                <div className="track-info" onClick={() => handlePlayTrack(track)}>
                  <span className="track-number">{index + 1}</span>
                  <img 
                    src={track.cover ? `${process.env.NEXT_PUBLIC_API_URL}/${track.cover}` : '/default-cover.png'} 
                    className="track-thumb" 
                    alt={track.title}
                    onError={(e) => { e.target.src = '/default-cover.png'; }}
                  />
                  <div>
                    <div className="track-name">{track.title}</div>
                    <div className="track-artist">
                      {track.artist_name && track.artist_id ? (
                        <Link href={`/artist/${track.artist_id}`}>{track.artist_name}</Link>
                      ) : 'Неизвестный артист'}
                    </div>
                  </div>
                </div>
                <div className="track-actions">
                  <LikeButton item={track} type="tracks" initialState={track.liked} />
                  <DownloadButton trackId={track.id} trackTitle={track.title} />
                  {isOwner && (
                    <i 
                      className="fas fa-times" 
                      style={{ color: '#ff6b6b', cursor: 'pointer' }}
                      onClick={() => handleRemoveTrack(track.id)}
                      title="Убрать из плейлиста"
                    ></i>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}