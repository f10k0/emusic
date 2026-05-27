import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import Link from 'next/link';

const LS_KEY = 'notifications_last_seen_count';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default function NotificationsButton() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  // Загружаем с задержкой чтобы не блокировать рендер
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(fetchNotifications, 800);
    return () => clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (open && dropdownRef.current && !dropdownRef.current.contains(e.target) && !buttonRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleScroll = () => { if (open) setOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const r = await api.get('/users/me/notifications');
      const all = r.data?.notifications || [];
      setNotifications(all);
      const lastSeen = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
      setUnread(Math.max(0, all.length - lastSeen));
    } catch {} finally { setLoading(false); }
  };

  const handleOpen = () => {
    if (!open) {
      fetchNotifications();
      setTimeout(() => {
        localStorage.setItem(LS_KEY, String(notifications.length || 0));
        setUnread(0);
      }, 300);
    }
    setOpen(o => !o);
  };

  if (!user) return null;

  const ICONS = { new_track: 'fa-music', new_event: 'fa-calendar-alt' };
  const COLORS = { new_track: 'var(--accent)', new_event: '#28a745' };

  return (
    <>
      <div ref={buttonRef} onClick={handleOpen} className="news-button" style={{ position: 'relative', cursor: 'pointer' }}>
        <i className="fas fa-bell"></i>
        <span>Уведомления</span>
        {unread > 0 && (
          <span className="badge" style={{
            position: 'absolute', top: -6, right: -6,
            background: '#dc3545', color: 'white',
            borderRadius: '50%', minWidth: 18, height: 18,
            fontSize: '0.65rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </div>

      {open && createPortal(
        <div ref={dropdownRef} className="notifications-dropdown" style={{
          position: 'fixed',
          top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + 8 : 60,
          right: buttonRef.current ? window.innerWidth - buttonRef.current.getBoundingClientRect().right : 24,
          zIndex: 10000,
          width: 340,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          maxHeight: '65vh',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
              <i className="fas fa-bell" style={{ color: 'var(--accent)', marginRight: 8 }}></i>
              Уведомления
            </h3>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <i className="fas fa-spinner fa-spin"></i>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <i className="fas fa-bell-slash" style={{ fontSize: '2rem', opacity: 0.3, display: 'block', marginBottom: 12 }}></i>
                Нет уведомлений
                <p style={{ fontSize: '0.8rem', marginTop: 8 }}>Подпишитесь на артистов чтобы получать уведомления</p>
              </div>
            ) : notifications.map(n => (
              <Link key={n.id}
                href={n.type === 'new_track' ? `/track/${n.track_id}` : `/events/${n.event_id}`}
                onClick={() => setOpen(false)}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Аватар/обложка */}
                  <div style={{ width: 42, height: 42, flexShrink: 0, borderRadius: n.type === 'new_track' ? 8 : '50%', overflow: 'hidden', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {(n.cover || n.artist_avatar) ? (
                      <img src={`${API}/${n.cover || n.artist_avatar}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => e.target.style.display = 'none'} alt="" />
                    ) : (
                      <i className={`fas ${ICONS[n.type]}`} style={{ color: COLORS[n.type], fontSize: '1.1rem' }}></i>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 2 }}>{n.title}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.body}</div>
                    {n.date && <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: 3 }}>{formatDate(n.date)}</div>}
                  </div>
                  <i className={`fas ${ICONS[n.type]}`} style={{ color: COLORS[n.type], fontSize: '0.75rem', marginTop: 2, flexShrink: 0 }}></i>
                </div>
              </Link>
            ))}
          </div>
          {notifications.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Уведомления из подписок за последние 30 дней
            </div>
          )}
        </div>, document.body
      )}
    </>
  );
}
