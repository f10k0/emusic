import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import api from '../../../lib/api';
import useAuthStore from '../../../store/authStore';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Link from 'next/link';

export default function EditTrack() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [track, setTrack] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [form, setForm] = useState({
    title: '',
    duration: '',
    album_id: '',
    cover: ''
  });

  useEffect(() => {
    if (id && user?.role === 'artist') {
      fetchTrack();
      fetchAlbums();
    }
  }, [id, user]);

  const fetchTrack = async () => {
    try {
      console.log('Загрузка трека ID:', id);
      const res = await api.get(`/submissions/tracks/${id}`);
      setTrack(res.data);
      setForm({
        title: res.data.title || '',
        duration: res.data.duration || '',
        album_id: res.data.album_id || '',
        cover: res.data.cover || ''
      });
    } catch (err) {
      console.error('Ошибка загрузки трека:', err);
      setError('Не удалось загрузить трек');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlbums = async () => {
    try {
      const res = await api.get('/albums/me');
      setAlbums(res.data || []);
    } catch (err) {
      console.error('Ошибка загрузки альбомов:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Форма отправлена, данные:', form);

    // Убираем валидацию на стороне браузера, просто отправляем
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Подготавливаем данные для отправки
      const dataToSend = {
        title: form.title,
        duration: form.duration ? parseInt(form.duration) : 0,
        album_id: form.album_id ? parseInt(form.album_id) : null,
        cover: form.cover || null
      };

      console.log('Отправка данных на сервер:', dataToSend);

      const res = await api.put(`/submissions/tracks/${id}`, dataToSend);
      console.log('Ответ сервера:', res.data);
      setSuccess('Трек успешно обновлён');
      
      // Обновляем данные трека
      setTrack(res.data);
    } catch (err) {
      console.error('Ошибка обновления:', err);
      if (err.response?.data?.detail) {
        setError(typeof err.response.data.detail === 'object' 
          ? JSON.stringify(err.response.data.detail) 
          : err.response.data.detail);
      } else {
        setError('Не удалось обновить трек. Проверьте подключение к серверу.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post(`/submissions/tracks/${id}/cover`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm({ ...form, cover: res.data.cover_url });
      setSuccess('Обложка успешно загружена');
    } catch (err) {
      console.error('Ошибка загрузки обложки:', err);
      setError('Не удалось загрузить обложку');
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="artist">
        <Layout>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: 'var(--accent)' }}></i>
            <p style={{ marginTop: '16px' }}>Загрузка трека...</p>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!track) {
    return (
      <ProtectedRoute requiredRole="artist">
        <Layout>
          <div className="form-container">
            <h2>Трек не найден</h2>
            <Link href="/artist/my-tracks" className="btn">Вернуться к моим трекам</Link>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="artist">
      <Layout>
        <div className="form-container" style={{ maxWidth: '600px' }}>
          <h2>Редактирование трека</h2>

          {error && (
            <div style={{ 
              backgroundColor: 'rgba(255, 75, 75, 0.1)', 
              border: '1px solid #ff4b4b', 
              borderRadius: '12px', 
              padding: '12px', 
              marginBottom: '20px',
              color: '#ff6b6b',
              whiteSpace: 'pre-wrap'
            }}>
              <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
              {error}
            </div>
          )}
          {success && (
            <div style={{ 
              backgroundColor: 'rgba(40, 167, 69, 0.1)', 
              border: '1px solid #28a745', 
              borderRadius: '12px', 
              padding: '12px', 
              marginBottom: '20px',
              color: '#28a745'
            }}>
              <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>
              {success}
            </div>
          )}

          <div style={{ marginBottom: '30px', textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img 
                src={form.cover ? `${process.env.NEXT_PUBLIC_API_URL}/${form.cover}` : '/default-cover.png'} 
                alt="cover" 
                style={{ 
                  width: '200px', 
                  height: '200px', 
                  borderRadius: '12px', 
                  objectFit: 'cover',
                  border: '3px solid var(--accent)'
                }}
                onError={(e) => { e.target.src = '/default-cover.png'; }}
              />
              <div 
                style={{ 
                  position: 'absolute', 
                  bottom: '10px', 
                  right: '10px', 
                  backgroundColor: 'var(--accent)',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                  transition: 'transform 0.2s'
                }}
                onClick={() => document.getElementById('cover-input').click()}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {uploading ? (
                  <i className="fas fa-spinner fa-spin" style={{ color: 'white' }}></i>
                ) : (
                  <i className="fas fa-camera" style={{ color: 'white' }}></i>
                )}
              </div>
              <input
                type="file"
                id="cover-input"
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleCoverUpload}
                disabled={uploading}
              />
            </div>
            <p style={{ marginTop: '10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Нажмите на иконку камеры, чтобы загрузить обложку
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="title">Название трека</label>
              <input
                type="text"
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                placeholder="Введите название трека"
              />
            </div>

            <div className="form-group">
              <label htmlFor="duration">Длительность (в секундах)</label>
              <input
                type="number"
                id="duration"
                name="duration"
                value={form.duration}
                onChange={handleChange}
                placeholder="Например: 180"
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="album_id">Альбом</label>
              <select 
                id="album_id"
                name="album_id"
                value={form.album_id} 
                onChange={handleChange}
              >
                <option value="">— Без альбома —</option>
                {albums.map(album => (
                  <option key={album.id} value={album.id}>
                    {album.title} {!album.is_published && '(не опубликован)'}
                  </option>
                ))}
              </select>
              <small>Выберите альбом для трека</small>
            </div>

            <div className="form-group">
              <label htmlFor="cover">Ссылка на обложку (опционально)</label>
              <input
                type="text"  // <--- ИЗМЕНЕНО: больше не url, чтобы избежать валидации браузера
                id="cover"
                name="cover"
                value={form.cover}
                onChange={handleChange}
                placeholder="https://example.com/cover.jpg"
              />
              <small>Можно указать ссылку вместо загрузки файла. Загруженный файл имеет приоритет.</small>
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => router.push('/artist/my-tracks')}
              >
                Отмена
              </button>
              <button 
                type="submit" 
                className="btn" 
                disabled={saving}
              >
                {saving ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </form>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}