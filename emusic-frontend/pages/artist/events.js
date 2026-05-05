import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import ProtectedRoute from '../../components/ProtectedRoute';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const EMPTY = { title: '', description: '', date: '', location: '', tickets_url: '' };

export default function ArtistEvents() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [image, setImage] = useState(null);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const API = process.env.NEXT_PUBLIC_API_URL;

  const fetchEvents = async () => {
    try {
      const r = await api.get('/events/?limit=100');
      // filter own
      const artist = user?.artist;
      setEvents((r.data || []).filter(e => !artist || e.artist_id === artist?.id));
    } catch { setEvents([]); }
  };

  useEffect(() => {
    if (user) fetchEvents();
  }, [user]);

  const resetForm = () => { setForm(EMPTY); setImage(null); setEditing(null); setShowForm(false); setError(''); };

  const startEdit = (ev) => {
    setEditing(ev.id);
    setForm({
      title: ev.title || '',
      description: ev.description || '',
      date: ev.date ? new Date(ev.date).toISOString().slice(0, 16) : '',
      location: ev.location || '',
      tickets_url: ev.tickets_url || '',
    });
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date) { setError('Заполните обязательные поля'); return; }
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (image) fd.append('image', image);
      if (editing) {
        await api.put(`/events/${editing}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/events/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      resetForm();
      fetchEvents();
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (id) => {
    if (!confirm('Удалить мероприятие?')) return;
    try { await api.delete(`/events/${id}`); fetchEvents(); } catch {}
  };

  return (
    <ProtectedRoute requiredRole="artist">
      <Layout>
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 4 }}>
                <i className="fas fa-calendar-plus" style={{ color: 'var(--accent)', marginRight: 10 }}></i>
                Мои мероприятия
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Создавайте концерты, релизы и встречи с фанатами</p>
            </div>
            {!showForm && (
              <button className="btn" style={{ padding: '10px 20px' }} onClick={() => { resetForm(); setShowForm(true); }}>
                <i className="fas fa-plus"></i> Добавить мероприятие
              </button>
            )}
          </div>

          {showForm && (
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 16, border: '1px solid var(--border)', padding: 24, marginBottom: 28 }}>
              <h3 style={{ marginBottom: 20 }}>{editing ? 'Редактировать' : 'Новое мероприятие'}</h3>
              {error && <div style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid #ff5050', borderRadius: 8, padding: '10px 14px', color: '#ff5050', marginBottom: 14 }}>{error}</div>}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Название *</label>
                  <input className="form-control" value={form.title} onChange={e => setForm(s => ({ ...s, title: e.target.value }))} placeholder="Название мероприятия" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Дата и время *</label>
                    <input type="datetime-local" className="form-control" value={form.date} onChange={e => setForm(s => ({ ...s, date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Место проведения</label>
                    <input className="form-control" value={form.location} onChange={e => setForm(s => ({ ...s, location: e.target.value }))} placeholder="Город, площадка" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Описание</label>
                  <textarea className="form-control" value={form.description} onChange={e => setForm(s => ({ ...s, description: e.target.value }))} rows={3} placeholder="Подробности о мероприятии…" />
                </div>
                <div className="form-group">
                  <label className="form-label">Ссылка на билеты</label>
                  <input className="form-control" value={form.tickets_url} onChange={e => setForm(s => ({ ...s, tickets_url: e.target.value }))} placeholder="https://…" />
                </div>
                <div className="form-group">
                  <label className="form-label">Изображение</label>
                  <input type="file" accept="image/*" className="form-control" onChange={e => setImage(e.target.files[0])} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" className="btn" disabled={loading} style={{ padding: '10px 22px' }}>
                    {loading ? <><i className="fas fa-spinner fa-spin"></i> Сохранение…</> : <><i className="fas fa-save"></i> {editing ? 'Сохранить' : 'Создать'}</>}
                  </button>
                  <button type="button" className="btn-secondary" onClick={resetForm} style={{ padding: '10px 18px' }}>Отмена</button>
                </div>
              </form>
            </div>
          )}

          <div className="event-manage-list">
            {events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <i className="fas fa-calendar-times" style={{ fontSize: '3rem', marginBottom: 16, display: 'block', opacity: 0.4 }}></i>
                Вы ещё не создали ни одного мероприятия
              </div>
            ) : events.map(ev => (
              <div key={ev.id} className="event-manage-item">
                {ev.image ? (
                  <img src={`${API}/${ev.image}`} className="event-manage-img" onError={e => { e.target.style.display = 'none'; }} alt="" />
                ) : (
                  <div className="event-manage-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
                    <i className="fas fa-calendar-alt" style={{ color: 'var(--accent)', opacity: 0.5 }}></i>
                  </div>
                )}
                <div className="event-manage-info">
                  <div className="event-manage-title">{ev.title}</div>
                  <div className="event-manage-date">{formatDate(ev.date)}</div>
                  {ev.location && <div className="event-manage-location"><i className="fas fa-map-marker-alt"></i> {ev.location}</div>}
                </div>
                <div className="event-manage-actions">
                  <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }} onClick={() => startEdit(ev)}>
                    <i className="fas fa-edit"></i>
                  </button>
                  <button className="reject-btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }} onClick={() => deleteEvent(ev.id)}>
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
