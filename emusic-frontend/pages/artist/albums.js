import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import ProtectedRoute from '../../components/ProtectedRoute';
import Link from 'next/link';

export default function ArtistAlbums() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAlbum, setNewAlbum] = useState({
    title: '',
    type: 'album',
    release_date: '',
    cover_image: ''
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user?.role === 'artist') {
      fetchAlbums();
    }
  }, [user]);

  const fetchAlbums = async () => {
    try {
      const res = await api.get('/albums/me');
      setAlbums(res.data || []);
    } catch (err) {
      console.error('Ошибка загрузки альбомов:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newAlbum.title.trim()) {
      alert('Введите название альбома');
      return;
    }
    setCreating(true);
    try {
      await api.post('/albums', newAlbum);
      setShowCreateForm(false);
      setNewAlbum({ title: '', type: 'album', release_date: '', cover_image: '' });
      fetchAlbums();
    } catch (err) {
      console.error('Ошибка создания альбома:', err);
      alert('Не удалось создать альбом');
    } finally {
      setCreating(false);
    }
  };

  const handlePublish = async (albumId) => {
    try {
      await api.put(`/albums/${albumId}/publish`);
      fetchAlbums();
    } catch (err) {
      console.error('Ошибка публикации:', err);
    }
  };

  const handleDelete = async (albumId) => {
    if (!confirm('Удалить альбом?')) return;
    try {
      await api.delete(`/albums/${albumId}`);
      fetchAlbums();
    } catch (err) {
      console.error('Ошибка удаления:', err);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="artist">
        <Layout>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: 'var(--accent)' }}></i>
            <p style={{ marginTop: '16px' }}>Загрузка альбомов...</p>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="artist">
      <Layout>
        <div className="profile-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2>Мои альбомы</h2>
            <button className="btn" onClick={() => setShowCreateForm(true)}>
              <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
              Создать альбом
            </button>
          </div>

          {showCreateForm && (
            <div className="form-container" style={{ marginBottom: '30px' }}>
              <h3>Новый альбом</h3>
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label>Название</label>
                  <input
                    type="text"
                    value={newAlbum.title}
                    onChange={(e) => setNewAlbum({ ...newAlbum, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Тип</label>
                  <select
                    value={newAlbum.type}
                    onChange={(e) => setNewAlbum({ ...newAlbum, type: e.target.value })}
                  >
                    <option value="album">Альбом</option>
                    <option value="single">Сингл</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Дата релиза</label>
                  <input
                    type="date"
                    value={newAlbum.release_date}
                    onChange={(e) => setNewAlbum({ ...newAlbum, release_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Ссылка на обложку</label>
                  <input
                    type="url"
                    value={newAlbum.cover_image}
                    onChange={(e) => setNewAlbum({ ...newAlbum, cover_image: e.target.value })}
                    placeholder="https://example.com/cover.jpg"
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn" disabled={creating}>
                    {creating ? 'Создание...' : 'Создать'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setShowCreateForm(false)}>Отмена</button>
                </div>
              </form>
            </div>
          )}

          {albums.length === 0 ? (
            <div style={{ 
              backgroundColor: 'var(--bg-secondary)', 
              borderRadius: '20px', 
              padding: '40px', 
              textAlign: 'center',
              border: '1px solid var(--border)'
            }}>
              <i className="fas fa-compact-disc" style={{ fontSize: '48px', color: 'var(--text-muted)', marginBottom: '16px' }}></i>
              <h3 style={{ marginBottom: '8px' }}>У вас пока нет альбомов</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                Создайте свой первый альбом
              </p>
              <button className="btn" onClick={() => setShowCreateForm(true)}>
                Создать альбом
              </button>
            </div>
          ) : (
            <div className="card-grid">
              {albums.map(album => (
                <div key={album.id} className="card">
                  <Link href={`/album/${album.id}`}>
                    <div className="card-image">
                      <img 
                        src={album.cover_image ? `${process.env.NEXT_PUBLIC_API_URL}/${album.cover_image}` : '/default-cover.png'} 
                        alt={album.title}
                        onError={(e) => { e.target.src = '/default-cover.png'; }}
                      />
                    </div>
                    <div className="card-title">{album.title}</div>
                    <div className="card-sub">
                      {album.type === 'album' ? 'Альбом' : 'Сингл'} • 
                      {album.is_published ? 'Опубликован' : 'Черновик'}
                    </div>
                  </Link>
                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <Link href={`/artist/edit-album/${album.id}`} style={{ marginRight: '10px', color: 'var(--text-secondary)' }}>
                        <i className="fas fa-edit" title="Редактировать"></i>
                      </Link>
                      {!album.is_published && (
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '5px 10px', fontSize: '0.8rem' }}
                          onClick={() => handlePublish(album.id)}
                        >
                          Опубликовать
                        </button>
                      )}
                    </div>
                    <i 
                      className="fas fa-trash" 
                      style={{ color: '#ff6b6b', cursor: 'pointer' }}
                      onClick={() => handleDelete(album.id)}
                    ></i>
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