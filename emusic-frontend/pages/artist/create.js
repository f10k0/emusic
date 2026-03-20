import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import ProtectedRoute from '../../components/ProtectedRoute';
import Link from 'next/link';

export default function CreateArtist() {
  const router = useRouter();
  const { user, fetchUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    bio: '',
    avatar: ''
  });

  useEffect(() => {
    if (user && user.role === 'artist') {
      router.push('/artist/upload');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      setError('Введите имя или псевдоним');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/artists/', form);
      console.log('Ответ:', response.data); // Для отладки
      await fetchUser();
      router.push('/artist/upload?welcome=true');
    } catch (err) {
      console.error('Ошибка создания артиста:', err);
      if (err.response && err.response.data && err.response.data.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'object') {
          setError(JSON.stringify(detail));
        } else {
          setError(detail);
        }
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Ошибка при создании профиля артиста. Попробуйте позже.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="form-container" style={{ maxWidth: '600px' }}>
          <h2>Стать артистом</h2>
          <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
            Заполните информацию о себе, чтобы начать публиковать свою музыку на платформе.
          </p>
          
          {error && (
            <div style={{ 
              backgroundColor: 'rgba(255, 75, 75, 0.1)', 
              border: '1px solid #ff4b4b', 
              borderRadius: '12px', 
              padding: '12px', 
              marginBottom: '20px',
              color: '#ff6b6b',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Имя / Псевдоним <span style={{ color: 'var(--accent)' }}>*</span></label>
              <input
                type="text"
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Например: Michael Jackson, Imagine Dragons"
                required
              />
              <small>Это имя будет отображаться на вашей странице артиста</small>
            </div>

            <div className="form-group">
              <label htmlFor="bio">Биография / Описание</label>
              <textarea
                id="bio"
                name="bio"
                value={form.bio}
                onChange={handleChange}
                placeholder="Расскажите о себе, своём творчестве, жанрах..."
                rows="5"
              />
              <small>Поддерживается обычный текст (до 1000 символов)</small>
            </div>

            <div className="form-group">
              <label htmlFor="avatar">Ссылка на аватарку</label>
              <input
                type="url"
                id="avatar"
                name="avatar"
                value={form.avatar}
                onChange={handleChange}
                placeholder="https://example.com/my-avatar.jpg"
              />
              <small>Можно указать ссылку на изображение (опционально)</small>
            </div>

            <div style={{ 
              backgroundColor: 'var(--bg-secondary)', 
              borderRadius: '16px', 
              padding: '20px', 
              marginBottom: '25px',
              border: '1px solid var(--border)'
            }}>
              <h4 style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-info-circle" style={{ color: 'var(--accent)' }}></i>
                Что вы получите?
              </h4>
              <ul style={{ listStyle: 'none', color: 'var(--text-secondary)' }}>
                <li style={{ marginBottom: '8px' }}>
                  <i className="fas fa-check" style={{ color: 'var(--accent)', marginRight: '10px' }}></i>
                  Возможность загружать свои треки
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <i className="fas fa-check" style={{ color: 'var(--accent)', marginRight: '10px' }}></i>
                  Личная страница артиста с альбомами и треками
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <i className="fas fa-check" style={{ color: 'var(--accent)', marginRight: '10px' }}></i>
                  Статистика прослушиваний ваших треков
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <i className="fas fa-check" style={{ color: 'var(--accent)', marginRight: '10px' }}></i>
                  Возможность добавлять треки в избранное слушателями
                </li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <Link href="/profile" className="btn-secondary">
                Отмена
              </Link>
              <button 
                type="submit" 
                className="btn" 
                disabled={loading || !form.name.trim()}
                style={{ 
                  opacity: (loading || !form.name.trim()) ? 0.6 : 1,
                  cursor: (loading || !form.name.trim()) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                    Создание...
                  </>
                ) : (
                  'Стать артистом'
                )}
              </button>
            </div>
          </form>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}