import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import ProtectedRoute from '../../components/ProtectedRoute';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminEvents() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', date: '', location: '', tickets_url: '' });
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const r = await api.get('/events/admin/all');
      setEvents(r.data || []);
    } catch {
      // Fallback to public endpoint
      try {
        const r = await api.get('/events/?limit=200');
        setEvents(r.data || []);
      } catch { setEvents([]); }
    } finally { setLoading(false); }
  };

  useEffect(() => { if (user?.role === 'admin') fetchEvents(); }, [user]);

  const startEdit = (ev) => {
    setEditingEvent(ev.id);
    setEditForm({
      title: ev.title || '',
      description: ev.description || '',
      date: ev.date ? new Date(ev.date).toISOString().slice(0, 16) : '',
      location: ev.location || '',
      tickets_url: ev.tickets_url || '',
    });
  };

  const saveEdit = async () => {
    setSaving(true);
    const fd = new FormData();
    Object.entries(editForm).forEach(([k, v]) => fd.append(k, v));
    try {
      await api.put(`/events/${editingEvent}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setEditingEvent(null);
      fetchEvents();
    } catch {} finally { setSaving(false); }
  };

  const toggleHide = async (ev) => {
    try {
      if (ev.is_published) {
        await api.patch(`/events/${ev.id}/hide`);
      } else {
        await api.patch(`/events/${ev.id}/publish`);
      }
      setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, is_published: !ev.is_published } : e));
    } catch {}
  };

  const deleteEvent = async (id) => {
    try {
      await api.delete(`/events/${id}`);
      setEvents(prev => prev.filter(e => e.id !== id));
      setConfirmDeleteId(null);
    } catch {}
  };

  const filtered = events.filter(ev => {
    const matchFilter = filter === 'all' || (filter === 'published' ? ev.is_published : !ev.is_published);
    const q = search.toLowerCase();
    const matchSearch = !q || ev.title?.toLowerCase().includes(q) || ev.artist_name?.toLowerCase().includes(q) || ev.location?.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  return (
    <ProtectedRoute requiredRole="admin">
      <Layout>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 4 }}>
              <i className="fas fa-calendar-alt" style={{ color: 'var(--accent)', marginRight: 10 }}></i>
              Модерация мероприятий
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Редактирование, скрытие и удаление событий артистов</p>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <input className="form-control" style={{ maxWidth: 280, padding: '8px 14px', fontSize: '0.88rem' }}
              placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} />
            {['all', 'published', 'hidden'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={filter === f ? 'btn' : 'btn-secondary'} style={{ padding: '8px 14px', fontSize: '0.83rem' }}>
                {f === 'all' ? `Все (${events.length})` : f === 'published' ? `Активные (${events.filter(e => e.is_published).length})` : `Скрытые (${events.filter(e => !e.is_published).length})`}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <i className="fas fa-calendar-times" style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12, opacity: 0.3 }}></i>
              Мероприятий не найдено
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(ev => (
                <div key={ev.id} style={{ background: 'var(--bg-elevated)', borderRadius: 14, border: `1px solid ${ev.is_published ? 'var(--border)' : 'rgba(255,100,100,0.3)'}`, overflow: 'hidden', opacity: ev.is_published ? 1 : 0.75 }}>
                  {editingEvent === ev.id ? (
                    // Форма редактирования
                    <div style={{ padding: 20 }}>
                      <h4 style={{ marginBottom: 14 }}>Редактировать мероприятие #{ev.id}</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div className="form-group">
                          <label className="form-label">Название</label>
                          <input className="form-control" value={editForm.title} onChange={e => setEditForm(s => ({ ...s, title: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Дата</label>
                          <input type="datetime-local" className="form-control" value={editForm.date} onChange={e => setEditForm(s => ({ ...s, date: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Место</label>
                          <input className="form-control" value={editForm.location} onChange={e => setEditForm(s => ({ ...s, location: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Ссылка на билеты</label>
                          <input className="form-control" value={editForm.tickets_url} onChange={e => setEditForm(s => ({ ...s, tickets_url: e.target.value }))} />
                        </div>
                      </div>
                      <div className="form-group" style={{ marginBottom: 14 }}>
                        <label className="form-label">Описание</label>
                        <textarea className="form-control" rows={2} value={editForm.description} onChange={e => setEditForm(s => ({ ...s, description: e.target.value }))} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn" style={{ padding: '7px 18px', fontSize: '0.85rem' }} onClick={saveEdit} disabled={saving}>
                          {saving ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save"></i> Сохранить</>}
                        </button>
                        <button className="btn-secondary" style={{ padding: '7px 14px', fontSize: '0.85rem' }} onClick={() => setEditingEvent(null)}>Отмена</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 0 }}>
                      {/* Картинка */}
                      <div style={{ width: 90, flexShrink: 0, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {ev.image
                          ? <img src={`${API}/${ev.image}`} style={{ width: '100%', height: 76, objectFit: 'cover', display: 'block' }} alt="" onError={e => { e.target.style.display = 'none'; }} />
                          : <i className="fas fa-calendar-alt" style={{ fontSize: '1.5rem', color: 'var(--accent)', opacity: 0.4 }}></i>
                        }
                      </div>
                      {/* Инфо */}
                      <div style={{ flex: 1, padding: '10px 16px', minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 2 }}>
                          {ev.title}
                          {!ev.is_published && <span style={{ marginLeft: 8, background: 'rgba(255,100,100,0.15)', color: '#ff9090', fontSize: '0.7rem', padding: '2px 7px', borderRadius: 8 }}>Скрыто</span>}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: 3 }}>{formatDate(ev.date)}</div>
                        <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {ev.location && <span><i className="fas fa-map-marker-alt" style={{ marginRight: 3 }}></i>{ev.location}</span>}
                          {ev.artist_name && <span><i className="fas fa-microphone-alt" style={{ marginRight: 3 }}></i>{ev.artist_name}</span>}
                        </div>
                      </div>
                      {/* Действия */}
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5, padding: '10px 12px', borderLeft: '1px solid var(--border)', flexShrink: 0 }}>
                        <button onClick={() => startEdit(ev)} className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                          <i className="fas fa-edit"></i> Изменить
                        </button>
                        <button onClick={() => toggleHide(ev)} className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                          <i className={`fas ${ev.is_published ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                          {ev.is_published ? 'Скрыть' : 'Показать'}
                        </button>
                        <button onClick={() => setConfirmDeleteId(ev.id)} className="btn-secondary reject-btn" style={{ padding: '5px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                          <i className="fas fa-trash"></i> Удалить
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {confirmDeleteId && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 16, padding: 28, width: 340, border: '1px solid var(--border)' }}>
              <h3 style={{ marginBottom: 10, fontSize: '1.05rem' }}><i className="fas fa-exclamation-triangle" style={{ color: '#ff6b6b', marginRight: 8 }}></i>Удалить мероприятие?</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 18, fontSize: '0.88rem' }}>Это действие нельзя отменить.</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setConfirmDeleteId(null)} style={{ padding: '8px 16px' }}>Отмена</button>
                <button onClick={() => deleteEvent(confirmDeleteId)} style={{ padding: '8px 16px', background: '#ff4d4d', border: 'none', color: 'white', borderRadius: 20, cursor: 'pointer', fontWeight: 600 }}>
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
