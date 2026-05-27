import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../lib/api';

const LS_KEY = 'news_last_seen_count';

export default function NewsButton() {
  const [open, setOpen] = useState(false);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [selectedNews, setSelectedNews] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  // Загружаем новости при старте чтобы показать badge
  useEffect(() => {
    fetchNews();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (open && dropdownRef.current && !dropdownRef.current.contains(e.target) && !buttonRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') { setFullscreenImage(null); setSelectedNews(null); }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await api.get('/news');
      const allNews = res.data || [];
      setNews(allNews);
      // Считаем непрочитанные
      const lastSeen = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
      setUnread(Math.max(0, allNews.length - lastSeen));
    } catch {} finally { setLoading(false); }
  };

  const handleOpen = () => {
    if (!open) {
      fetchNews();
      // Помечаем все как прочитанные при открытии
      setTimeout(() => {
        localStorage.setItem(LS_KEY, String(news.length || 0));
        setUnread(0);
      }, 300);
    }
    setOpen(o => !o);
  };

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  return (
    <>
      <div ref={buttonRef} className="news-button" onClick={handleOpen} style={{ position: 'relative' }}>
        <i className="fas fa-newspaper"></i>
        <span>Новости</span>
        {unread > 0 && (
          <span className="badge" style={{
            position: 'absolute', top: -6, right: -6,
            background: 'var(--accent)', color: 'white',
            borderRadius: '50%', minWidth: 18, height: 18,
            fontSize: '0.7rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </div>

      {open && createPortal(
        <div ref={dropdownRef} className="news-dropdown" style={{
          position: 'fixed',
          top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + 8 : 0,
          right: buttonRef.current ? window.innerWidth - buttonRef.current.getBoundingClientRect().right : 0,
          zIndex: 10000,
          width: 360,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Новости</h3>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <i className="fas fa-spinner fa-spin"></i>
              </div>
            ) : news.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Новостей пока нет</div>
            ) : news.map(item => (
              <div key={item.id} onClick={() => setSelectedNews(item)}
                style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {item.image && (
                  <img src={`${API}/${item.image}`} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 10, display: 'block' }}
                    onError={e => e.target.style.display = 'none'} alt="" />
                )}
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.content}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  {new Date(item.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </div>
              </div>
            ))}
          </div>
        </div>, document.body
      )}

      {/* Детальный просмотр новости */}
      {selectedNews && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setSelectedNews(null)}>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 20, maxWidth: 580, width: '100%', maxHeight: '85vh', overflowY: 'auto', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            {selectedNews.image && (
              <img src={`${API}/${selectedNews.image}`} style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: '20px 20px 0 0', cursor: 'zoom-in' }}
                onClick={() => setFullscreenImage(`${API}/${selectedNews.image}`)}
                onError={e => e.target.style.display = 'none'} alt="" />
            )}
            <div style={{ padding: '24px 28px' }}>
              <h2 style={{ marginBottom: 12, fontSize: '1.3rem' }}>{selectedNews.title}</h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.92rem', whiteSpace: 'pre-wrap' }}>{selectedNews.content}</p>
              <div style={{ marginTop: 16, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {new Date(selectedNews.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <button onClick={() => setSelectedNews(null)} className="btn-secondary" style={{ marginTop: 20, width: '100%' }}>
                Закрыть
              </button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* Fullscreen image */}
      {fullscreenImage && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 10002, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
          onClick={() => setFullscreenImage(null)}>
          <img src={fullscreenImage} style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} alt="" />
        </div>, document.body
      )}
    </>
  );
}
