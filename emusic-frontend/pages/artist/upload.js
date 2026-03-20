import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import ProtectedRoute from '../../components/ProtectedRoute';
import useAuthStore from '../../store/authStore';

export default function UploadTrack() {
  const router = useRouter();
  const { welcome } = router.query;
  const { user } = useAuthStore();
  const [showWelcome, setShowWelcome] = useState(false);
  const [form, setForm] = useState({
    title: '',
    duration: '',
    album_id: '',
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (welcome === 'true') {
      setShowWelcome(true);
      const timer = setTimeout(() => setShowWelcome(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [welcome]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user || user.role !== 'artist') {
      setError('У вас нет прав артиста. Сначала создайте профиль артиста.');
      return;
    }

    if (!file) {
      setError('Выберите аудиофайл');
      return;
    }

    if (!form.title.trim()) {
      setError('Введите название трека');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    
    // Отправляем отдельные поля (как требует обновленный бэкенд)
    formData.append('title', form.title.trim());
    formData.append('duration', form.duration ? parseInt(form.duration).toString() : '0');
    if (form.album_id) {
      formData.append('album_id', form.album_id);
    }
    formData.append('file', file);

    console.log('Отправка формы:');
    for (let pair of formData.entries()) {
      console.log(pair[0] + ': ' + pair[1]);
    }

    try {
      const response = await api.post('/submissions/', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        },
      });
      console.log('Ответ:', response.data);
      router.push('/artist/submissions?success=true');
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      if (err.response && err.response.data && err.response.data.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'object') {
          setError(JSON.stringify(detail, null, 2));
        } else {
          setError(detail);
        }
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Ошибка загрузки. Проверьте файл и попробуйте снова.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="artist">
      <Layout>
        <div className="form-container" style={{ maxWidth: '600px' }}>
          {showWelcome && (
            <div style={{ 
              backgroundColor: 'rgba(136, 51, 255, 0.1)', 
              border: '1px solid var(--accent)', 
              borderRadius: '12px', 
              padding: '16px', 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <i className="fas fa-star" style={{ color: 'var(--accent)', fontSize: '24px' }}></i>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Добро пожаловать в семью артистов!</strong>
                <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Теперь вы можете загружать свои треки. Они попадут на модерацию, после одобрения станут доступны всем слушателям.
                </p>
              </div>
            </div>
          )}

          <h2>Загрузить трек</h2>
          
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
              <label htmlFor="title">Название трека <span style={{ color: 'var(--accent)' }}>*</span></label>
              <input
                type="text"
                id="title"
                name="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Введите название трека"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="duration">Длительность (в секундах)</label>
              <input
                type="number"
                id="duration"
                name="duration"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                placeholder="Например: 180"
                min="0"
              />
              <small>Можно указать позже или оставить 0</small>
            </div>

            <div className="form-group">
              <label htmlFor="album_id">Альбом (если есть)</label>
              <select 
                id="album_id"
                name="album_id"
                value={form.album_id} 
                onChange={(e) => setForm({ ...form, album_id: e.target.value })}
              >
                <option value="">— Без альбома (сингл) —</option>
              </select>
              <small>Создайте альбом, чтобы группировать треки</small>
            </div>

            <div className="form-group">
              <label htmlFor="file">Аудиофайл (MP3) <span style={{ color: 'var(--accent)' }}>*</span></label>
              <input
                type="file"
                id="file"
                name="file"
                accept="audio/mpeg"
                onChange={(e) => setFile(e.target.files[0])}
                required
              />
              <small>Максимальный размер: 50 МБ</small>
            </div>

            <div style={{ 
              backgroundColor: 'var(--bg-secondary)', 
              borderRadius: '16px', 
              padding: '16px', 
              marginBottom: '25px',
              border: '1px solid var(--border)'
            }}>
              <h4 style={{ marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <i className="fas fa-clock" style={{ marginRight: '8px', color: 'var(--accent)' }}></i>
                Что дальше?
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                После загрузки трек отправится на модерацию. Администратор проверит его и опубликует, если всё хорошо.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => router.push('/profile')}
              >
                Отмена
              </button>
              <button 
                type="submit" 
                className="btn" 
                disabled={loading || !form.title.trim() || !file}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                    Загрузка...
                  </>
                ) : 'Отправить на модерацию'}
              </button>
            </div>
          </form>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}