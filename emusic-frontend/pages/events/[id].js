import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import Link from 'next/link';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function generateICS(event) {
  const start = new Date(event.date);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//eMusic//Events//RU',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location || ''}`,
    `URL:${event.tickets_url || ''}`,
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${event.title}.ics`; a.click();
  URL.revokeObjectURL(url);
}

export default function EventDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (!id) return;
    api.get(`/events/${id}`).then(r => setEvent(r.data)).catch(() => router.push('/events')).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <Layout>
      <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
      </div>
    </Layout>
  );
  if (!event) return null;

  return (
    <Layout>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>
        <button onClick={() => router.push('/events')} className="btn-secondary" style={{ marginBottom: 24, padding: '8px 16px' }}>
          <i className="fas fa-arrow-left"></i> Все мероприятия
        </button>

        {event.image ? (
          <img src={`${API}/${event.image}`} className="event-detail-hero" alt="" onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="event-detail-hero" style={{ background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16, marginBottom: 24 }}>
            <i className="fas fa-calendar-alt" style={{ fontSize: '4rem', color: 'var(--accent)', opacity: 0.4 }}></i>
          </div>
        )}

        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 12 }}>{event.title}</h1>
        <div className="event-detail-date"><i className="fas fa-clock" style={{ marginRight: 6 }}></i>{formatDate(event.date)}</div>
        {event.location && (
          <div className="event-detail-location"><i className="fas fa-map-marker-alt" style={{ marginRight: 6 }}></i>{event.location}</div>
        )}

        {event.artist_name && (
          <Link href={`/artist/${event.artist_id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', marginBottom: 20, textDecoration: 'none', color: 'var(--text-secondary)' }}>
            <i className="fas fa-microphone-alt" style={{ color: 'var(--accent)' }}></i> {event.artist_name}
          </Link>
        )}

        {event.description && (
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 14, padding: 20, border: '1px solid var(--border)', marginBottom: 24, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
            {event.description}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {event.tickets_url && (
            <a href={event.tickets_url} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding: '12px 24px', textDecoration: 'none' }}>
              <i className="fas fa-ticket-alt"></i> Купить билеты
            </a>
          )}
          <button className="ics-btn" onClick={() => generateICS(event)}>
            <i className="fas fa-calendar-plus"></i> Добавить в календарь
          </button>
        </div>
      </div>
    </Layout>
  );
}
