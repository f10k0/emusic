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
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
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
      const submissionRes = await api.post('/submissions/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Если выбрана обложка — загружаем её отдельным запросом
      if (coverFile && submissionRes.data?.track_id) {
        const coverForm = new FormData();
        coverForm.append('file', coverFile);
        await api.post(`/submissions/tracks/${submissionRes.data.track_id}/cover`, coverForm, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }).catch(() => {}); // Не блокируем если обложка не загрузилась
      }

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
                    {mood.emoji && <i className={`fas ${mood.emoji}`} style={{marginRight:5}}></i>}{mood.name}
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
                <span><i className="fas fa-ban" style={{marginRight:5,color:"var(--accent)"}}></i>Контент 18+ (будет скрыт по умолчанию)</span>
              </label>
            </div>

                        <div className="form-group">
              <label>Обложка трека</label>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginTop: 8 }}>
                {/* Превью */}
                <div style={{
                  width: 100, height: 100, flexShrink: 0,
                  borderRadius: 12, overflow: 'hidden',
                  background: 'var(--bg-elevated)',
                  border: '2px dashed var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}>
                  {coverPreview ? (
                    <>
                      <img src={coverPreview} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" />
                      <button
                        type="button"
                        onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                        style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </>
                  ) : (
                    <i className="fas fa-image" style={{ fontSize: '2rem', color: 'var(--text-muted)', opacity: 0.4 }}></i>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="cover-upload"
                    onChange={e => {
                      const f = e.target.files[0];
                      if (!f) return;
                      setCoverFile(f);
                      setCoverPreview(URL.createObjectURL(f));
                    }}
                  />
                  <label htmlFor="cover-upload" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', borderRadius: 20 }}>
                    <i className="fas fa-upload"></i>
                    {coverFile ? 'Сменить обложку' : 'Выбрать обложку'}
                  </label>
                  <p style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Рекомендуемый размер: 500×500 px. Форматы: JPG, PNG, WebP.
                  </p>
                  {coverFile && (
                    <p style={{ marginTop: 4, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <i className="fas fa-check-circle" style={{ color: '#28a745', marginRight: 4 }}></i>
                      {coverFile.name}
                    </p>
                  )}
                </div>
              </div>
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