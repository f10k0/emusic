import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
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
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

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
    setFormError('');
    if (!newAlbum.title.trim()) {
      setFormError('Введите название альбома');
      return;
    }
    if (!newAlbum.release_date) {
      setFormError('Введите дату создания альбома');
      return;
    }
    setCreating(true);
    try {
      const albumData = {
        title: newAlbum.title.trim(),
        type: newAlbum.type || 'album',
        release_date: new Date(newAlbum.release_date).toISOString(),
      };
      // cover_image оставляем пустым — загрузим файлом отдельно
      const res = await api.post('/albums', albumData);
      // Загружаем обложку если выбрана
      if (coverFile && res.data?.id) {
        const fd = new FormData();
        fd.append('file', coverFile);
        await api.post(`/albums/${res.data.id}/cover`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }).catch(() => {});
      }
      setShowCreateForm(false);
      setFormError('');
      setNewAlbum({ title: '', type: 'album', release_date: '', cover_image: '' });
      setCoverFile(null);
      setCoverPreview(null);
      fetchAlbums();
    } catch (err) {
      console.error('Ошибка создания альбома:', err);
      toast('Не удалось создать альбом', 'error');
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
                  <label>Обложка альбома</label>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginTop: 8 }}>
                    <div style={{
                      width: 88, height: 88, flexShrink: 0,
                      borderRadius: 10, overflow: 'hidden',
                      background: 'var(--bg-elevated)',
                      border: '2px dashed var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative',
                    }}>
                      {coverPreview ? (
                        <>
                          <img src={coverPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                            style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.65)', border: 'none', color: 'white', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-times"></i>
                          </button>
                        </>
                      ) : (
                        <i className="fas fa-image" style={{ fontSize: '1.8rem', color: 'var(--text-muted)', opacity: 0.35 }}></i>
                      )}
                    </div>
                    <div>
                      <input type="file" accept="image/*" id="album-cover-upload" style={{ display: 'none' }}
                        onChange={e => {
                          const f = e.target.files[0];
                          if (!f) return;
                          setCoverFile(f);
                          setCoverPreview(URL.createObjectURL(f));
                        }}
                      />
                      <label htmlFor="album-cover-upload" className="btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', cursor: 'pointer', fontSize: '0.83rem', borderRadius: 20 }}>
                        <i className="fas fa-upload"></i>
                        {coverFile ? 'Сменить' : 'Выбрать обложку'}
                      </label>
                      {coverFile && <p style={{ marginTop: 5, fontSize: '0.78rem', color: 'var(--text-secondary)' }}><i className="fas fa-check-circle" style={{ color: '#28a745', marginRight: 4 }}></i>{coverFile.name}</p>}
                      <p style={{ marginTop: 4, fontSize: '0.76rem', color: 'var(--text-muted)' }}>JPG, PNG, WebP · 500×500 px</p>
                    </div>
                  </div>
                </div>
                {formError && (
                  <div style={{
                    background: 'rgba(220,53,69,0.1)', border: '1px solid rgba(220,53,69,0.4)',
                    borderRadius: 10, padding: '10px 14px', color: '#dc3545',
                    fontSize: '0.88rem', marginBottom: 4,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <i className="fas fa-exclamation-circle"></i>
                    {formError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn" disabled={creating}>
                    {creating ? 'Создание...' : 'Создать'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => { setShowCreateForm(false); setFormError(''); }}>Отмена</button>
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