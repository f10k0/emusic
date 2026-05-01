import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import usePlayerStore from '../../store/playerStore';
import ProtectedRoute from '../../components/ProtectedRoute';
import Link from 'next/link';

export default function MyTracks() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setTrack } = usePlayerStore();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (user && user.role === 'artist') {
      fetchTracks();
    }
  }, [user]);

  const fetchTracks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/artists/me/tracks');
      setTracks(res.data || []);
    } catch (err) {
      console.error('Ошибка загрузки треков:', err);
      setError('Не удалось загрузить треки');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (trackId) => {
    if (!confirm('Вы уверены, что хотите удалить этот трек? Это действие нельзя отменить.')) {
      return;
    }

    setDeletingId(trackId);
    try {
      await api.delete(`/submissions/tracks/${trackId}`);
      setTracks(tracks.filter(t => t.id !== trackId));
    } catch (err) {
      console.error('Ошибка удаления:', err);
      alert('Не удалось удалить трек');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePlay = (track) => {
    setTrack(track, tracks);
  };

  const getStatusBadge = (isPublished) => {
    return isPublished ? (
      <span style={{ 
        backgroundColor: 'rgba(40, 167, 69, 0.1)', 
        color: '#28a745',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '0.85rem',
        fontWeight: '600'
      }}>
        Опубликован
      </span>
    ) : (
      <span style={{ 
        backgroundColor: 'rgba(255, 193, 7, 0.1)', 
        color: '#ffc107',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '0.85rem',
        fontWeight: '600'
      }}>
        На модерации
      </span>
    );
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="artist">
        <Layout>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: 'var(--accent)' }}></i>
            <p style={{ marginTop: '16px' }}>Загрузка треков...</p>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="artist">
      <Layout>
        <div className="profile-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
            <h2>Мои треки</h2>
            <Link href="/artist/upload" className="btn">
              <i className="fas fa-upload" style={{ marginRight: '8px' }}></i>
              Загрузить новый трек
            </Link>
          </div>

          {error && (
            <div style={{ 
              backgroundColor: 'rgba(255, 75, 75, 0.1)', 
              border: '1px solid #ff4b4b', 
              borderRadius: '12px', 
              padding: '12px', 
              marginBottom: '20px',
              color: '#ff6b6b'
            }}>
              <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
              {error}
            </div>
          )}

          {tracks.length === 0 ? (
            <div style={{ 
              backgroundColor: 'var(--bg-secondary)', 
              borderRadius: '20px', 
              padding: '40px', 
              textAlign: 'center',
              border: '1px solid var(--border)'
            }}>
              <i className="fas fa-music" style={{ fontSize: '48px', color: 'var(--text-muted)', marginBottom: '16px' }}></i>
              <h3 style={{ marginBottom: '8px' }}>У вас пока нет треков</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                Загрузите свой первый трек, чтобы он появился здесь
              </p>
              <Link href="/artist/upload" className="btn">
                Загрузить трек
              </Link>
            </div>
          ) : (
            <div className="track-list">
              {tracks.map(track => (
                <div key={track.id} className="track-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                      <img 
                        src={track.cover ? `${process.env.NEXT_PUBLIC_API_URL}/${track.cover}` : '/default-cover.png'} 
                        style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover', cursor: 'pointer' }}
                        alt={track.title}
                        onClick={() => handlePlay(track)}
                        onError={(e) => { e.target.src = '/default-cover.png'; }}
                      />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ marginBottom: '4px', cursor: 'pointer' }} onClick={() => handlePlay(track)}>
                          {track.title}
                        </h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          <i className="fas fa-headphones" style={{ marginRight: '5px' }}></i>
                          {track.play_count || 0} прослушиваний
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      {getStatusBadge(track.is_published)}
                      <Link href={`/artist/edit-track/${track.id}`} style={{ color: 'var(--text-secondary)' }}>
                        <i className="fas fa-edit" title="Редактировать"></i>
                      </Link>
                      <i 
                        className="fas fa-trash" 
                        style={{ 
                          color: deletingId === track.id ? 'var(--text-muted)' : '#ff6b6b',
                          cursor: deletingId === track.id ? 'wait' : 'pointer',
                          opacity: deletingId === track.id ? 0.5 : 1
                        }}
                        onClick={() => handleDelete(track.id)}
                        title="Удалить"
                      ></i>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}