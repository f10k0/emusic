import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../lib/api';

export default function NewsButton() {
  const [open, setOpen] = useState(false);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const detailModalRef = useRef(null);

  useEffect(() => {
    if (open) {
      fetchNews();
    }
  }, [open]);

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
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && fullscreenImage) {
        setFullscreenImage(null);
      }
      if (e.key === 'Escape' && selectedNews) {
        closeNewsModal();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenImage, selectedNews]);

  // Очистка класса при размонтировании
  useEffect(() => {
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await api.get('/news');
      setNews(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openNewsModal = (newsItem, e) => {
    e.stopPropagation();
    setSelectedNews(newsItem);
    setOpen(false);
    document.body.classList.add('modal-open'); // блокируем прокрутку
  };

  const closeNewsModal = () => {
    setSelectedNews(null);
    document.body.classList.remove('modal-open'); // возвращаем прокрутку
  };

  const openFullscreenImage = (imageUrl, e) => {
    e.stopPropagation();
    setFullscreenImage(imageUrl);
  };

  const closeFullscreenImage = () => {
    setFullscreenImage(null);
  };

  const shareNews = () => {
    if (selectedNews) {
      const url = `${window.location.origin}/news/${selectedNews.id}`;
      navigator.clipboard.writeText(url);
      alert('Ссылка скопирована в буфер обмена');
    }
  };

  return (
    <>
      <div
        ref={buttonRef}
        className="news-button"
        onClick={() => setOpen(!open)}
      >
        <i className="fas fa-newspaper"></i>
        <span>Новости</span>
        {news.length > 0 && (
          <span className="badge">
            {news.length}
          </span>
        )}
      </div>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className="news-dropdown"
          style={{
            position: 'fixed',
            top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + 8 : 0,
            right: buttonRef.current ? window.innerWidth - buttonRef.current.getBoundingClientRect().right : 0,
            width: '320px',
            maxHeight: '400px',
            backgroundColor: 'var(--bg-elevated)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
            zIndex: 2000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'dropdownFade 0.2s ease'
          }}
        >
          <div className="news-dropdown-header">
            <h3>Новости</h3>
            <i
              className="fas fa-times"
              onClick={() => setOpen(false)}
            ></i>
          </div>
          <div className="news-dropdown-list">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <i className="fas fa-spinner fa-spin"></i>
                <p>Загрузка...</p>
              </div>
            ) : news.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                <i className="fas fa-newspaper" style={{ fontSize: '2rem', marginBottom: '10px' }}></i>
                <p>Новостей пока нет</p>
              </div>
            ) : (
              news.map(item => (
                <div
                  key={item.id}
                  className="news-dropdown-item"
                  onClick={(e) => openNewsModal(item, e)}
                >
                  {item.image && (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL}/${item.image}`}
                      alt=""
                      className="news-dropdown-image"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <div className="news-dropdown-info">
                    <div className="news-dropdown-title">{item.title}</div>
                    <div className="news-dropdown-date">
                      {new Date(item.created_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}

      {selectedNews && createPortal(
        <div
          className="news-detail-overlay"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            ref={detailModalRef}
            className="news-detail-modal-large"
            onClick={(e) => e.stopPropagation()}
          >
            <i
              className="fas fa-times news-detail-close"
              onClick={closeNewsModal}
            ></i>
            <div className="news-detail-scroll">
              <div className="news-detail-inner">
                {selectedNews.image && (
                  <div className="news-detail-image-wrapper">
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL}/${selectedNews.image}`}
                      alt={selectedNews.title}
                      className="news-detail-image"
                      onClick={(e) => openFullscreenImage(`${process.env.NEXT_PUBLIC_API_URL}/${selectedNews.image}`, e)}
                      style={{ cursor: 'pointer' }}
                      title="Нажмите для увеличения"
                    />
                  </div>
                )}
                <div className="news-detail-content-wrapper">
                  <h1 className="news-detail-title">{selectedNews.title}</h1>
                  <div className="news-detail-date">
                    <i className="far fa-calendar-alt"></i>
                    {new Date(selectedNews.created_at).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="news-detail-content">
                    {selectedNews.content.split('\n').map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                  <div className="news-share-button">
                    <button onClick={shareNews}>
                      <i className="fas fa-share-alt"></i> Поделиться
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {fullscreenImage && createPortal(
        <div
          className="fullscreen-overlay"
          onClick={closeFullscreenImage}
        >
          <div
            className="fullscreen-container"
            onClick={(e) => e.stopPropagation()}
          >
            <i
              className="fas fa-times fullscreen-close"
              onClick={closeFullscreenImage}
            ></i>
            <img
              src={fullscreenImage}
              alt="Полноэкранное изображение"
              className="fullscreen-image"
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}