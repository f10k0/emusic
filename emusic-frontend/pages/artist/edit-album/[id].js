import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import api from '../../../lib/api';
import useAuthStore from '../../../store/authStore';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Link from 'next/link';

export default function EditAlbum() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [album, setAlbum] = useState(null);
  const [form, setForm] = useState({
    title: '',
    type: 'album',
    release_date: '',
    cover_image: ''
  });

  useEffect(() => {
    if (id && user?.role === 'artist') {
      fetchAlbum();
    }
  }, [id, user]);

  const fetchAlbum = async () => {
    try {
      const res = await api.get(`/albums/${id}`);
      setAlbum(res.data);
      setForm({
        title: res.data.title || '',
        type: res.data.type || 'album',
        release_date: res.data.release_date ? res.data.release_date.split('T')[0] : '',
        cover_image: res.data.cover_image || ''
      });
    } catch (err) {
      console.error('Ошибка загрузки альбома:', err);
      setError('Не удалось загрузить альбом');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.put(`/albums/${id}`, form);
      setSuccess('Альбом успешно обновлён');
      fetchAlbum();
    } catch (err) {
      console.error('Ошибка обновления:', err);
      setError('Не удалось обновить альбом');
    } finally {
      setSaving(false);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingCover(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post(`/albums/${id}/cover`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm({ ...form, cover_image: res.data.cover_url });
      setSuccess('Обложка успешно загружена');
    } catch (err) {
      console.error('Ошибка загрузки обложки:', err);
      setError('Не удалось загрузить обложку');
    } finally {
      setUploadingCover(false);
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
            <p style={{ marginTop: '16px' }}>Загрузка альбома...</p>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!album) {
    return (
      <ProtectedRoute requiredRole="artist">
        <Layout>
          <div className="form-container">
            <h2>Альбом не найден</h2>
            <p style={{ marginBottom: '20px' }}>Запрошенный альбом не существует или был удалён.</p>
            <Link href="/artist/albums" className="btn">Вернуться к альбомам</Link>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="artist">
      <Layout>
        <div className="form-container" style={{ maxWidth: '600px' }}>
          <h2>Редактирование альбома</h2>
          
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
                src={form.cover_image ? `${process.env.NEXT_PUBLIC_API_URL}/${form.cover_image}` : '/default-cover.png'} 
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
                  boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
                }}
                onClick={() => document.getElementById('cover-input').click()}
              >
                {uploadingCover ? (
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
                disabled={uploadingCover}
              />
            </div>
            <p style={{ marginTop: '10px', color: 'var(--text-secondary)' }}>
              Загрузите обложку альбома
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="title">Название альбома</label>
              <input
                type="text"
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="type">Тип</label>
              <select
                id="type"
                name="type"
                value={form.type}
                onChange={handleChange}
              >
                <option value="album">Альбом</option>
                <option value="single">Сингл</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="release_date">Дата релиза</label>
              <input
                type="date"
                id="release_date"
                name="release_date"
                value={form.release_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="cover_image">Ссылка на обложку (опционально)</label>
              <input
                type="url"
                id="cover_image"
                name="cover_image"
                value={form.cover_image}
                onChange={handleChange}
                placeholder="https://example.com/cover.jpg"
              />
              <small>Можно указать ссылку вместо загрузки файла</small>
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => router.push('/artist/albums')}
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