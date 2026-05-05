import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import ProtectedRoute from '../../components/ProtectedRoute';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatCount(n) {
  if (!n) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

export default function MyClips() {
  const { user } = useAuthStore();
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchClips = async () => {
    setLoading(true);
    try {
      // Получаем профиль артиста чтобы узнать artist_id
      const artistRes = await api.get('/artists/me').catch(() => null);
      const myArtistId = artistRes?.data?.id;
      if (!myArtistId) { setClips([]); return; }

      // Используем эндпоинт для своих видео включая скрытые
      const r = await api.get(`/videos/my?artist_id=${myArtistId}`);
      setClips(r.data || []);
    } catch {
      setClips([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) fetchClips(); }, [user]);

  const startEdit = (clip) => {
    setEditingId(clip.id);
    setEditForm({ title: clip.title, description: clip.description || '' });
    setError('');
  };

  const saveEdit = async (clipId) => {
    if (!editForm.title.trim()) { setError('Введите название'); return; }
    setSaving(true);
    try {
      // PATCH endpoint — обновляем title/description через форму
      const fd = new FormData();
      fd.append('title', editForm.title);
      fd.append('description', editForm.description);
      await api.patch(`/videos/${clipId}/edit`, fd);
      setEditingId(null);
      fetchClips();
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (clip) => {
    try {
      if (clip.is_published) {
        await api.patch(`/videos/${clip.id}/hide`);
      } else {
        await api.patch(`/videos/${clip.id}/publish`);
      }
      // Обновляем локально — не перезагружаем, чтобы скрытые остались видны
      setClips(prev => prev.map(c =>
        c.id === clip.id ? { ...c, is_published: !clip.is_published } : c
      ));
    } catch {}
  };

  const deleteClip = async (clipId) => {
    if (!confirm('Удалить клип? Это действие нельзя отменить.')) return;
    try {
      await api.delete(`/videos/${clipId}`);
      setClips(prev => prev.filter(c => c.id !== clipId));
    } catch {}
  };

  return (
    <ProtectedRoute requiredRole="artist">
      <Layout>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 4 }}>
                <i className="fas fa-film" style={{ color: 'var(--accent)', marginRight: 10 }}></i>
                Мои клипы
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Управление вашими видеоклипами</p>
            </div>
            <a href="/artist/upload-video" className="btn" style={{ padding: '10px 20px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-plus"></i> Загрузить клип
            </a>
          </div>

          {error && (
            <div style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid #ff5050', borderRadius: 10, padding: '10px 16px', color: '#ff5050', marginBottom: 16 }}>{error}</div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
            </div>
          ) : clips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <i className="fas fa-film" style={{ fontSize: '3rem', marginBottom: 16, display: 'block', opacity: 0.3 }}></i>
              <p>У вас пока нет клипов</p>
              <a href="/artist/upload-video" className="btn" style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', textDecoration: 'none' }}>
                <i className="fas fa-upload"></i> Загрузить первый клип
              </a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {clips.map(clip => (
                <div key={clip.id} style={{ background: 'var(--bg-elevated)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', gap: 0 }}>
                    {/* Превью видео */}
                    <div style={{ width: 120, flexShrink: 0, background: '#000', position: 'relative' }}>
                      <video
                        src={`${API}/${clip.file_path}`}
                        style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }}
                        muted
                        preload="metadata"
                      />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fas fa-play-circle" style={{ fontSize: '2rem', color: 'rgba(255,255,255,0.7)' }}></i>
                      </div>
                      {!clip.is_published && (
                        <div style={{ position: 'absolute', top: 4, left: 4, background: 'rgba(0,0,0,0.7)', borderRadius: 4, padding: '2px 6px', fontSize: '0.68rem', color: '#aaa' }}>
                          Скрыт
                        </div>
                      )}
                    </div>

                    {/* Информация */}
                    <div style={{ flex: 1, padding: '12px 16px' }}>
                      {editingId === clip.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <input
                            className="form-control"
                            style={{ fontSize: '0.9rem', padding: '6px 10px' }}
                            value={editForm.title}
                            onChange={e => setEditForm(s => ({ ...s, title: e.target.value }))}
                            placeholder="Название клипа"
                          />
                          <textarea
                            className="form-control"
                            style={{ fontSize: '0.85rem', padding: '6px 10px', resize: 'vertical', minHeight: 48 }}
                            value={editForm.description}
                            onChange={e => setEditForm(s => ({ ...s, description: e.target.value }))}
                            placeholder="Описание (хэштеги, ссылки...)"
                            rows={2}
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn" style={{ padding: '5px 14px', fontSize: '0.82rem' }} onClick={() => saveEdit(clip.id)} disabled={saving}>
                              {saving ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-check"></i> Сохранить</>}
                            </button>
                            <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.82rem' }} onClick={() => { setEditingId(null); setError(''); }}>
                              Отмена
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{clip.title}</div>
                          {clip.description && (
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.3 }}>{clip.description}</div>
                          )}
                          <div style={{ display: 'flex', gap: 14, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            <span><i className="fas fa-eye" style={{ marginRight: 4 }}></i>{formatCount(clip.play_count)}</span>
                            <span><i className="fas fa-heart" style={{ marginRight: 4 }}></i>{formatCount(clip.likes)}</span>
                            <span><i className="fas fa-calendar-alt" style={{ marginRight: 4 }}></i>{formatDate(clip.created_at)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Действия */}
                    {editingId !== clip.id && (
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, padding: '12px 14px', borderLeft: '1px solid var(--border)', flexShrink: 0 }}>
                        <button
                          onClick={() => startEdit(clip)}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}
                          title="Редактировать"
                        >
                          <i className="fas fa-edit"></i> Изменить
                        </button>
                        <button
                          onClick={() => toggleVisibility(clip)}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}
                          title={clip.is_published ? 'Скрыть' : 'Опубликовать'}
                        >
                          <i className={`fas ${clip.is_published ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                          {clip.is_published ? 'Скрыть' : 'Показать'}
                        </button>
                        <button
                          onClick={() => deleteClip(clip.id)}
                          className="btn-secondary reject-btn"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}
                          title="Удалить"
                        >
                          <i className="fas fa-trash"></i> Удалить
                        </button>
                      </div>
                    )}
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
