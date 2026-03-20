import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import ProtectedRoute from '../../components/ProtectedRoute';
import Link from 'next/link';

export default function AdminTracks() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchTracks();
    }
  }, [user]);

  const fetchTracks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/tracks');
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
      await api.delete(`/admin/tracks/${trackId}`);
      setTracks(tracks.filter(t => t.id !== trackId));
    } catch (err) {
      console.error('Ошибка удаления:', err);
      alert('Не удалось удалить трек');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="admin">
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
    <ProtectedRoute requiredRole="admin">
      <Layout>
        <div className="profile-container">
          <h2>Управление треками</h2>
          
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
              <h3 style={{ marginBottom: '8px' }}>Нет треков</h3>
              <p style={{ color: 'var(--text-secondary)' }}>В системе пока нет загруженных треков.</p>
            </div>
          ) : (
            <div className="track-list">
              {tracks.map(track => (
                <div key={track.id} className="track-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                      <img 
                        src={track.cover ? `${process.env.NEXT_PUBLIC_API_URL}/${track.cover}` : '/default-cover.png'} 
                        style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover' }}
                        alt={track.title}
                        onError={(e) => { e.target.src = '/default-cover.png'; }}
                      />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ marginBottom: '4px' }}>{track.title}</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          <strong>Артист:</strong> {track.artist_name || 'Неизвестно'} | 
                          <strong> ID:</strong> {track.id} | 
                          <strong> Статус:</strong> {track.is_published ? 'Опубликован' : 'Не опубликован'}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <i 
                        className="fas fa-trash" 
                        style={{ 
                          color: deletingId === track.id ? 'var(--text-muted)' : '#ff6b6b',
                          cursor: deletingId === track.id ? 'wait' : 'pointer',
                          opacity: deletingId === track.id ? 0.5 : 1,
                          fontSize: '1.2rem'
                        }}
                        onClick={() => handleDelete(track.id)}
                        title="Удалить трек"
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