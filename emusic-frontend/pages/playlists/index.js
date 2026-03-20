import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import ProtectedRoute from '../../components/ProtectedRoute';
import Link from 'next/link';
import CreatePlaylistForm from '../../components/CreatePlaylistForm';
import Modal from '../../components/Modal';

const PlaylistCard = React.memo(({ playlist, onTogglePublic, onDelete }) => {
  return (
    <div className="card" style={{ position: 'relative' }}>
      <Link href={`/playlists/${playlist.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="card-image">
          <img 
            src={playlist.cover_image ? `${process.env.NEXT_PUBLIC_API_URL}/${playlist.cover_image}` : '/default-playlist.png'} 
            alt={playlist.name}
            onError={(e) => { e.target.src = '/default-playlist.png'; }}
          />
        </div>
        <div className="card-title">{playlist.name}</div>
        <div className="card-sub">
          {playlist.tracks?.length || 0} треков
        </div>
      </Link>
      
      <div style={{ 
        marginTop: '10px', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '5px', 
          fontSize: '0.85rem',
          cursor: 'pointer',
          color: playlist.is_public ? 'var(--accent-light)' : 'var(--text-muted)',
          backgroundColor: playlist.is_public ? 'rgba(136, 51, 255, 0.1)' : 'transparent',
          padding: '4px 10px',
          borderRadius: '20px',
          transition: 'all 0.2s'
        }}>
          <input
            type="checkbox"
            checked={playlist.is_public}
            onChange={() => onTogglePublic(playlist)}
            style={{ width: '14px', height: '14px', cursor: 'pointer' }}
          />
          <span>{playlist.is_public ? 'Публичный' : 'Приватный'}</span>
        </label>
        
        <i 
          className="fas fa-trash" 
          style={{ 
            color: '#ff6b6b', 
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onClick={() => onDelete(playlist.id)}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        ></i>
      </div>
    </div>
  );
});

export default function MyPlaylists() {
  const router = useRouter();
  const { create } = router.query;
  const { user } = useAuthStore();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Стабилизируем функции
  const handleCloseModal = useCallback(() => setShowModal(false), []);
  const handleOpenModal = useCallback(() => setShowModal(true), []);

  useEffect(() => {
    if (user) {
      fetchPlaylists();
    }
  }, [user]);

  useEffect(() => {
    if (create === 'true') {
      setShowModal(true);
      router.replace('/playlists', undefined, { shallow: true });
    }
  }, [create]);

  const fetchPlaylists = async () => {
    try {
      const res = await api.get('/playlists/my');
      setPlaylists(res.data || []);
    } catch (err) {
      console.error('Ошибка загрузки плейлистов:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = useCallback(async (id) => {
    if (!confirm('Удалить плейлист?')) return;
    try {
      await api.delete(`/playlists/${id}`);
      fetchPlaylists();
    } catch (err) {
      console.error('Ошибка удаления:', err);
    }
  }, []);

  const handleTogglePublic = useCallback(async (playlist) => {
    try {
      await api.put(`/playlists/${playlist.id}`, {
        ...playlist,
        is_public: !playlist.is_public
      });
      fetchPlaylists();
    } catch (err) {
      console.error('Ошибка изменения статуса:', err);
    }
  }, []);

  const handleFormSuccess = useCallback(() => {
    fetchPlaylists();
    setShowModal(false);
  }, []);

  const playlistCards = useMemo(() => {
    return playlists.map(playlist => (
      <PlaylistCard 
        key={playlist.id}
        playlist={playlist}
        onTogglePublic={handleTogglePublic}
        onDelete={handleDelete}
      />
    ));
  }, [playlists, handleTogglePublic, handleDelete]);

  if (loading && playlists.length === 0) {
    return (
      <ProtectedRoute>
        <Layout>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: 'var(--accent)' }}></i>
            <p style={{ marginTop: '16px' }}>Загрузка плейлистов...</p>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="profile-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
            <h2>Мои плейлисты</h2>
            <button 
              className="btn" 
              onClick={handleOpenModal}
            >
              <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
              Создать плейлист
            </button>
          </div>

          <Modal isOpen={showModal} onClose={handleCloseModal}>
            <CreatePlaylistForm 
              onClose={handleCloseModal}
              onSuccess={handleFormSuccess}
            />
          </Modal>

          {playlists.length === 0 ? (
            <div style={{ 
              backgroundColor: 'var(--bg-secondary)', 
              borderRadius: '20px', 
              padding: '40px', 
              textAlign: 'center',
              border: '1px solid var(--border)'
            }}>
              <i className="fas fa-list" style={{ fontSize: '48px', color: 'var(--text-muted)', marginBottom: '16px' }}></i>
              <h3 style={{ marginBottom: '8px' }}>У вас пока нет плейлистов</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                Создайте свой первый плейлист
              </p>
              <button className="btn" onClick={handleOpenModal}>
                Создать плейлист
              </button>
            </div>
          ) : (
            <div className="card-grid">
              {playlistCards}
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}