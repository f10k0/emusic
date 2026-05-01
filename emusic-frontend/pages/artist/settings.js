import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import ProtectedRoute from '../../components/ProtectedRoute';
import Link from 'next/link';

export default function ArtistSettings() {
  const router = useRouter();
  const { user, fetchUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [artist, setArtist] = useState(null);
  const [form, setForm] = useState({
    name: '',
    bio: '',
    avatar: ''
  });

  useEffect(() => {
    if (user && user.role === 'artist') {
      fetchArtistProfile();
    }
  }, [user]);

  const fetchArtistProfile = async () => {
    try {
      const res = await api.get('/artists/me');
      setArtist(res.data);
      setForm({
        name: res.data.name || '',
        bio: res.data.bio || '',
        avatar: res.data.avatar || ''
      });
    } catch (err) {
      console.error('Ошибка загрузки профиля:', err);
      setError('Не удалось загрузить профиль');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.put('/artists/me', form);
      setSuccess('Профиль успешно обновлён');
      await fetchArtistProfile();
      await fetchUser();
    } catch (err) {
      console.error('Ошибка обновления:', err);
      setError('Ошибка при обновлении профиля');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post('/artists/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm({ ...form, avatar: res.data.avatar_url });
      setSuccess('Аватар успешно загружен');
    } catch (err) {
      console.error('Ошибка загрузки аватара:', err);
      setError('Ошибка при загрузке аватара');
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  if (!artist) {
    return (
      <ProtectedRoute requiredRole="artist">
        <Layout>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: 'var(--accent)' }}></i>
            <p style={{ marginTop: '16px' }}>Загрузка профиля...</p>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="artist">
      <Layout>
        <div className="form-container" style={{ maxWidth: '600px' }}>
          <h2>Настройки профиля артиста</h2>

          {error && (
            <div style={{ backgroundColor: 'rgba(255,75,75,0.1)', border: '1px solid #ff4b4b', borderRadius: '12px', padding: '12px', marginBottom: '20px', color: '#ff6b6b' }}>
              <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
              {error}
            </div>
          )}
          {success && (
            <div style={{ backgroundColor: 'rgba(40,167,69,0.1)', border: '1px solid #28a745', borderRadius: '12px', padding: '12px', marginBottom: '20px', color: '#28a745' }}>
              <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>
              {success}
            </div>
          )}

          <div style={{ marginBottom: '30px', textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img 
                src={form.avatar ? `${process.env.NEXT_PUBLIC_API_URL}/${form.avatar}` : '/default-avatar.png'} 
                alt="avatar" 
                style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent)' }}
              />
              <div style={{ position: 'absolute', bottom: '10px', right: '10px', backgroundColor: 'var(--accent)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
                onClick={() => document.getElementById('avatar-input').click()}
              >
                {uploading ? <i className="fas fa-spinner fa-spin" style={{ color: 'white' }}></i> : <i className="fas fa-camera" style={{ color: 'white' }}></i>}
              </div>
              <input type="file" id="avatar-input" style={{ display: 'none' }} accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
            </div>
            <p style={{ marginTop: '10px', color: 'var(--text-secondary)' }}>Нажмите на иконку камеры, чтобы загрузить новое фото</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Имя / Псевдоним</label>
              <input type="text" id="name" name="name" value={form.name} onChange={handleChange} placeholder="Ваше имя или псевдоним" required />
            </div>
            <div className="form-group">
              <label htmlFor="bio">Биография / Описание</label>
              <textarea id="bio" name="bio" value={form.bio} onChange={handleChange} placeholder="Расскажите о себе" rows="5" />
            </div>
            <div className="form-group">
              <label htmlFor="avatar">Ссылка на аватар (опционально)</label>
              <input type="url" id="avatar" name="avatar" value={form.avatar} onChange={handleChange} placeholder="https://example.com/image.jpg" />
              <small>Можно указать ссылку вместо загрузки файла. Загруженный файл имеет приоритет.</small>
            </div>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" className="btn-secondary" onClick={() => router.push('/profile')}>Отмена</button>
              <button type="submit" className="btn" disabled={loading}>{loading ? 'Сохранение...' : 'Сохранить изменения'}</button>
            </div>
          </form>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}