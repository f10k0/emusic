import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import ProtectedRoute from '../../components/ProtectedRoute';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatCount(n) {
  if (!n) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

export default function AdminVideos() {
  const { user } = useAuthStore();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | published | hidden
  const [search, setSearch] = useState('');
  const [confirmId, setConfirmId] = useState(null); // id видео для подтверждения удаления

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const r = await api.get('/videos/admin/all?limit=200');
      setVideos(r.data || []);
    } catch {
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user?.role === 'admin') fetchVideos(); }, [user]);

  const hideVideo = async (id) => {
    try {
      await api.patch(`/videos/${id}/hide`);
      setVideos(v => v.map(x => x.id === id ? { ...x, is_published: false } : x));
    } catch {}
  };

  const publishVideo = async (id) => {
    try {
      await api.patch(`/videos/${id}/publish`);
      setVideos(v => v.map(x => x.id === id ? { ...x, is_published: true } : x));
    } catch {}
  };

  const deleteVideo = async (id) => {
    try {
      await api.delete(`/videos/${id}`);
      setVideos(v => v.filter(x => x.id !== id));
      setConfirmId(null);
    } catch {}
  };

  const filtered = videos.filter(v => {
    const matchFilter = filter === 'all' || (filter === 'published' ? v.is_published : !v.is_published);
    const matchSearch = !search || v.title?.toLowerCase().includes(search.toLowerCase()) || v.artist_name?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <ProtectedRoute requiredRole="admin">
      <Layout>
        <div style={{ padding: '32px 24px' }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 4 }}>
              <i className="fas fa-film" style={{ color: 'var(--accent)', marginRight: 10 }}></i>
              Модерация видео
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Управление клипами артистов — скрытие, удаление, мониторинг
            </p>
          </div>

          {/* Фильтры */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="form-control"
              style={{ maxWidth: 280, padding: '8px 14px', fontSize: '0.88rem' }}
              placeholder="Поиск по названию или артисту..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {['all', 'published', 'hidden'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={filter === f ? 'btn' : 'btn-secondary'}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                {f === 'all' ? `Все (${videos.length})` : f === 'published' ? `Опубликованные (${videos.filter(v => v.is_published).length})` : `Скрытые (${videos.filter(v => !v.is_published).length})`}
              </button>
            ))}
          </div>

          {/* Статистика */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Всего видео', value: videos.length, icon: 'fa-film' },
              { label: 'Просмотров суммарно', value: formatCount(videos.reduce((a, v) => a + (v.play_count || 0), 0)), icon: 'fa-eye' },
              { label: 'Лайков суммарно', value: formatCount(videos.reduce((a, v) => a + (v.likes || 0), 0)), icon: 'fa-heart' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: '14px 18px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <i className={`fas ${s.icon}`} style={{ color: 'var(--accent)', fontSize: '1.3rem', width: 28, textAlign: 'center' }}></i>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{s.value}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Список */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <i className="fas fa-film" style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12, opacity: 0.3 }}></i>
              Видео не найдено
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(v => (
                <div key={v.id} style={{
                  background: 'var(--bg-elevated)',
                  borderRadius: 12,
                  border: `1px solid ${v.is_published ? 'var(--border)' : 'rgba(255,100,100,0.3)'}`,
                  display: 'flex',
                  gap: 0,
                  overflow: 'hidden',
                  opacity: v.is_published ? 1 : 0.7,
                }}>
                  {/* Превью */}
                  <div style={{ width: 100, flexShrink: 0, background: '#000', position: 'relative' }}>
                    <video
                      src={`${API}/${v.file_path}`}
                      style={{ width: '100%', height: 72, objectFit: 'cover', display: 'block' }}
                      muted preload="metadata"
                    />
                    {!v.is_published && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fas fa-eye-slash" style={{ color: '#ff9090', fontSize: '1.1rem' }}></i>
                      </div>
                    )}
                  </div>

                  {/* Инфо */}
                  <div style={{ flex: 1, padding: '10px 16px', minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {v.title}
                      {!v.is_published && <span style={{ marginLeft: 8, background: 'rgba(255,100,100,0.15)', color: '#ff9090', fontSize: '0.7rem', padding: '2px 7px', borderRadius: 8 }}>Скрыт</span>}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                      <i className="fas fa-microphone-alt" style={{ marginRight: 5 }}></i>{v.artist_name}
                      <span style={{ margin: '0 8px' }}>·</span>
                      <i className="fas fa-calendar-alt" style={{ marginRight: 4 }}></i>{formatDate(v.created_at)}
                    </div>
                    <div style={{ display: 'flex', gap: 14, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span><i className="fas fa-eye" style={{ marginRight: 4 }}></i>{formatCount(v.play_count)}</span>
                      <span><i className="fas fa-heart" style={{ marginRight: 4 }}></i>{formatCount(v.likes)}</span>
                      <span><i className="fas fa-thumbs-down" style={{ marginRight: 4 }}></i>{formatCount(v.dislikes)}</span>
                    </div>
                  </div>

                  {/* Действия */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, padding: '10px 14px', borderLeft: '1px solid var(--border)', flexShrink: 0 }}>
                    {v.is_published ? (
                      <button
                        onClick={() => hideVideo(v.id)}
                        className="btn-secondary"
                        style={{ padding: '5px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
                        title="Скрыть видео"
                      >
                        <i className="fas fa-eye-slash"></i> Скрыть
                      </button>
                    ) : (
                      <button
                        onClick={() => publishVideo(v.id)}
                        className="btn-secondary"
                        style={{ padding: '5px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
                        title="Опубликовать"
                      >
                        <i className="fas fa-eye"></i> Показать
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmId(v.id)}
                      className="btn-secondary reject-btn"
                      style={{ padding: '5px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
                      title="Удалить навсегда"
                    >
                      <i className="fas fa-trash"></i> Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Подтверждение удаления */}
        {confirmId && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 16, padding: 28, width: 360, border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
              <h3 style={{ marginBottom: 12, fontSize: '1.1rem' }}>
                <i className="fas fa-exclamation-triangle" style={{ color: '#ff6b6b', marginRight: 8 }}></i>
                Удалить видео?
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: '0.9rem', lineHeight: 1.5 }}>
                Это действие нельзя отменить. Видео и все его комментарии будут удалены навсегда.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setConfirmId(null)} style={{ padding: '9px 18px' }}>
                  Отмена
                </button>
                <button className="btn reject-btn" onClick={() => deleteVideo(confirmId)} style={{ padding: '9px 18px', background: '#ff4d4d', border: 'none', color: 'white' }}>
                  <i className="fas fa-trash"></i> Удалить
                </button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}
