import { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import ProtectedRoute from '../../components/ProtectedRoute';
import Modal from '../../components/Modal';

export default function AdminTracks() {
  const toast = useToast();
  const router = useRouter();
  const { user } = useAuthStore();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  
  // Состояния для модального окна редактирования
  const [editingTrack, setEditingTrack] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    duration: '',
    album_id: '',
    cover: '',
    genre_ids: [],
    is_adult: false,
  });
  const [genres, setGenres] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [moods, setMoods] = useState([]);
  const [genreSearch, setGenreSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchTracks();
      fetchGenres();
      fetchMoods();
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

  const fetchMoods = async () => {
    try {
      const r = await api.get('/moods/');
      setMoods(r.data || []);
    } catch {}
  };

  const fetchGenres = async () => {
    try {
      const res = await api.get('/genres');
      setGenres(res.data || []);
    } catch (err) {
      console.error('Ошибка загрузки жанров:', err);
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
      toast('Не удалось удалить трек', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (track) => {
    setEditingTrack(track);
    setEditForm({
      title: track.title || '',
      duration: track.duration || '',
      album_id: track.album_id || '',
      cover: track.cover || '',
      genre_ids: track.genres?.map(g => g.id) || [],
      is_adult: track.is_adult || false,
    });
    setSelectedGenres(track.genres?.map(g => g.id) || []);
    setSelectedMoods(track.moods?.map(m => m.id) || []);
    setGenreSearch('');
  };

  const closeEditModal = () => {
    setEditingTrack(null);
    setEditForm({
      title: '',
      duration: '',
      album_id: '',
      cover: '',
      genre_ids: []
    });
    setSelectedGenres([]);
    setSelectedMoods([]);
    setGenreSearch('');
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingTrack) return;
    
    setSaving(true);
    try {
      const dataToSend = {
        title: editForm.title,
        duration: parseInt(editForm.duration) || 0,
        album_id: editForm.album_id ? parseInt(editForm.album_id) : null,
        cover: editForm.cover || null,
        genre_ids: selectedGenres,
        is_adult: editForm.is_adult,
        mood_ids: selectedMoods,
      };
      
      await api.put(`/admin/tracks/${editingTrack.id}`, dataToSend);
      toast('Трек успешно обновлён', 'success');
      closeEditModal();
      fetchTracks();
    } catch (err) {
      console.error('Ошибка обновления:', err);
      toast('Не удалось обновить трек', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredGenres = genres.filter(g => 
    g.name.toLowerCase().includes(genreSearch.toLowerCase())
  );

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
                          <strong> Статус:</strong> {track.is_published ? 'Опубликован' : 'Не опубликован'} | 
                          <strong> Жанры:</strong> {track.genres?.map(g => g.name).join(', ') || '—'}
                          {track.is_adult && (
                            <span style={{ marginLeft: 8, background: 'rgba(220,53,69,0.12)', color: '#dc3545', fontSize: '0.72rem', padding: '2px 8px', borderRadius: 8, fontWeight: 600, border: '1px solid rgba(220,53,69,0.25)' }}>
                              18+
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <i 
                        className="fas fa-edit" 
                        style={{ 
                          color: 'var(--accent)', 
                          cursor: 'pointer',
                          fontSize: '1.2rem'
                        }}
                        onClick={() => openEditModal(track)}
                        title="Редактировать трек"
                      ></i>
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

      {/* Модальное окно для редактирования трека */}
      <Modal isOpen={!!editingTrack} onClose={closeEditModal}>
        <div style={{ maxWidth: '500px' }}>
          <h2>Редактирование трека</h2>
          <form onSubmit={handleEditSubmit}>
            <div className="form-group">
              <label>Название</label>
              <input
                type="text"
                name="title"
                value={editForm.title}
                onChange={handleEditChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Длительность (сек)</label>
              <input
                type="number"
                name="duration"
                value={editForm.duration}
                onChange={handleEditChange}
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Ссылка на обложку</label>
              <input
                type="text"
                name="cover"
                value={editForm.cover}
                onChange={handleEditChange}
                placeholder="https://example.com/cover.jpg"
              />
            </div>

            <div className="form-group">
              <label>Жанры</label>
              <input
                type="text"
                placeholder="Поиск жанра..."
                value={genreSearch}
                onChange={(e) => setGenreSearch(e.target.value)}
                style={{ marginBottom: '10px' }}
              />
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '10px', 
                maxHeight: '150px', 
                overflowY: 'auto', 
                padding: '5px', 
                background: 'var(--bg-secondary)', 
                borderRadius: '12px' 
              }}>
                {filteredGenres.map(genre => (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => {
                      if (selectedGenres.includes(genre.id)) {
                        setSelectedGenres(selectedGenres.filter(id => id !== genre.id));
                      } else {
                        setSelectedGenres([...selectedGenres, genre.id]);
                      }
                    }}
                    style={{
                      background: selectedGenres.includes(genre.id) ? 'var(--accent-gradient)' : 'var(--bg-elevated)',
                      border: 'none',
                      borderRadius: '30px',
                      padding: '6px 16px',
                      color: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '0.9rem'
                    }}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
              <small>Выберите один или несколько жанров для трека</small>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label style={{ marginBottom: 8, display: 'block' }}>Настроения трека</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {moods.map(mood => (
                  <button key={mood.id} type="button"
                    onClick={() => setSelectedMoods(prev => prev.includes(mood.id) ? prev.filter(id => id !== mood.id) : [...prev, mood.id])}
                    style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: '0.8rem', cursor: 'pointer',
                      border: selectedMoods.includes(mood.id) ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: selectedMoods.includes(mood.id) ? 'rgba(136,51,255,0.18)' : 'var(--bg-secondary)',
                      color: selectedMoods.includes(mood.id) ? 'var(--accent-light)' : 'var(--text-secondary)',
                      transition: 'all 0.15s',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    {mood.emoji && <i className={`fas ${mood.emoji}`} style={{ fontSize: '0.7rem' }}></i>}
                    {mood.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={!!editForm.is_adult}
                  onChange={e => setEditForm(prev => ({ ...prev, is_adult: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-ban" style={{ color: 'var(--accent)', fontSize: '0.85rem' }}></i>
                  Контент 18+ (будет скрыт у пользователей с фильтром)
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" className="btn-secondary" onClick={closeEditModal} disabled={saving}>
                Отмена
              </button>
              <button type="submit" className="btn" disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </ProtectedRoute>
  );
}