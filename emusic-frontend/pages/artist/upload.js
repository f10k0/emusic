import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function UploadTrack() {
  const router = useRouter();
  const { welcome } = router.query;
  const { user } = useAuthStore();
  const [showWelcome, setShowWelcome] = useState(false);
  const [albums, setAlbums] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [moods, setMoods] = useState([]);
  const [lyrics, setLyrics] = useState('');
  const [isAdult, setIsAdult] = useState(false);
  const [genreSearch, setGenreSearch] = useState('');
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

  useEffect(() => {
    if (user?.role === 'artist') {
      fetchAlbums();
      fetchGenres();
      fetchMoods();
    }
  }, [user]);

  const fetchAlbums = async () => {
    try {
      const res = await api.get('/albums/me');
      setAlbums(res.data || []);
    } catch (err) {
      console.error('Ошибка загрузки альбомов:', err);
    }
  };

  const fetchGenres = async () => {
    try {
      const res = await api.get('/genres');
      setGenres(res.data || []);
    } catch (err) {
      console.error('Ошибка загрузки жанров:', err);
    }
  };

  const fetchMoods = async () => {
    try {
      const res = await api.get('/moods/');
      setMoods(res.data || []);
    } catch (err) { console.error(err); }
  };

  const filteredGenres = genres.filter(g => 
    g.name.toLowerCase().includes(genreSearch.toLowerCase())
  );

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
    formData.append('title', form.title.trim());
    formData.append('duration', form.duration ? parseInt(form.duration).toString() : '0');
    if (form.album_id) {
      formData.append('album_id', form.album_id);
    }
    formData.append('genre_ids', JSON.stringify(selectedGenres));
    formData.append('mood_ids', JSON.stringify(selectedMoods));
    formData.append('lyrics', lyrics);
    formData.append('is_adult', isAdult ? 'true' : 'false');
    formData.append('file', file);

    try {
      await api.post('/submissions/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      router.push('/artist/submissions?success=true');
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      if (err.response?.status === 401) {
        setError('Сессия истекла. Войдите заново.');
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
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
                  Теперь вы можете загружать свои треки. Они попадут на модерацию.
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
              whiteSpace: 'pre-wrap'
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
                {albums.map(album => (
                  <option key={album.id} value={album.id}>
                    {album.title} {!album.is_published && '(не опубликован)'}
                  </option>
                ))}
              </select>
              <small>Выберите альбом для трека</small>
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

            <div className="form-group">
              <label>Настроения трека</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                {moods.map((mood) => (
                  <button
                    key={mood.id}
                    type="button"
                    onClick={() => {
                      if (selectedMoods.includes(mood.id)) {
                        setSelectedMoods(selectedMoods.filter(id => id !== mood.id));
                      } else {
                        setSelectedMoods([...selectedMoods, mood.id]);
                      }
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      border: selectedMoods.includes(mood.id) ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: selectedMoods.includes(mood.id) ? 'rgba(136,51,255,0.2)' : 'var(--bg-elevated)',
                      color: selectedMoods.includes(mood.id) ? 'var(--accent-light)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.83rem',
                      transition: 'all 0.2s',
                    }}
                  >
                    {mood.emoji} {mood.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="lyrics">Текст трека</label>
              <textarea
                id="lyrics"
                className="form-control"
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                rows={6}
                placeholder={"Текст с таймкодами: [0:30] Первый куплет\n[1:00] Второй куплет\nИли просто текст без таймкодов"}
              />
              <small>Формат таймкода: [мм:сс] Строка текста</small>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isAdult}
                  onChange={(e) => setIsAdult(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
                <span>🔞 Контент 18+ (будет скрыт по умолчанию)</span>
              </label>
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
                ) : (
                  'Отправить на модерацию'
                )}
              </button>
            </div>
          </form>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}