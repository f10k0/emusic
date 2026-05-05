import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import Link from 'next/link';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const API = process.env.NEXT_PUBLIC_API_URL;

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 60 });
      if (city) params.append('city', city);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      const r = await api.get(`/events/?${params}`);
      setEvents(r.data || []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  return (
    <Layout>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>
          <i className="fas fa-calendar-alt" style={{ color: 'var(--accent)', marginRight: 12 }}></i>
          Мероприятия
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>Концерты, релизы и события ваших любимых артистов</p>

        <div className="event-filter-bar">
          <input
            className="event-filter-input"
            placeholder="Город..."
            value={city}
            onChange={e => setCity(e.target.value)}
            style={{ minWidth: 160 }}
          />
          <input
            className="event-filter-input"
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
          />
          <input
            className="event-filter-input"
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
          />
          <button className="btn" onClick={fetchEvents} style={{ padding: '8px 20px' }}>
            <i className="fas fa-search"></i> Найти
          </button>
          <button className="btn-secondary" onClick={() => { setCity(''); setFromDate(''); setToDate(''); setTimeout(fetchEvents, 0); }} style={{ padding: '8px 16px' }}>
            Сбросить
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <i className="fas fa-calendar-times" style={{ fontSize: '3rem', marginBottom: 16, display: 'block' }}></i>
            Мероприятий не найдено
          </div>
        ) : (
          <div className="events-grid">
            {events.map(ev => (
              <Link key={ev.id} href={`/events/${ev.id}`} style={{ textDecoration: 'none' }}>
                <div className="event-card">
                  {ev.image ? (
                    <img
                      src={`${API}/${ev.image}`}
                      className="event-card-img"
                      onError={e => { e.target.style.background = 'var(--bg-secondary)'; e.target.style.display = 'flex'; }}
                      alt=""
                    />
                  ) : (
                    <div className="event-card-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
                      <i className="fas fa-calendar-alt" style={{ fontSize: '2.5rem', color: 'var(--accent)', opacity: 0.4 }}></i>
                    </div>
                  )}
                  <div className="event-card-body">
                    <div className="event-card-date">{formatDate(ev.date)}</div>
                    <div className="event-card-title">{ev.title}</div>
                    {ev.location && (
                      <div className="event-card-location">
                        <i className="fas fa-map-marker-alt"></i> {ev.location}
                      </div>
                    )}
                    {ev.artist_name && (
                      <div className="event-card-artist">
                        <i className="fas fa-microphone-alt"></i> {ev.artist_name}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
