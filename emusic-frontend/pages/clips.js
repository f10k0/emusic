import { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function formatCount(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

// ── Лист комментариев ────────────────────────────────────────────────────────
function CommentsSheet({ videoId, onClose }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null); // { id, username }
  const { user } = useAuthStore();

  useEffect(() => {
    api.get(`/videos/${videoId}/comments`).then(r => setComments(r.data || [])).catch(() => {});
  }, [videoId]);

  const submit = async () => {
    if (!text.trim() || !user) return;
    const fd = new FormData();
    fd.append('content', text);
    if (replyTo) fd.append('parent_id', replyTo.id);
    try {
      await api.post(`/videos/${videoId}/comments`, fd);
      const fresh = await api.get(`/videos/${videoId}/comments`);
      setComments(fresh.data || []);
      setText('');
      setReplyTo(null);
    } catch {}
  };

  const likeComment = async (cid) => {
    try { await api.post(`/videos/comments/${cid}/like`); } catch {}
    const fresh = await api.get(`/videos/${videoId}/comments`);
    setComments(fresh.data || []);
  };

  const renderComment = (c, depth = 0) => (
    <div key={c.id} style={{ marginLeft: depth * 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <img
          src={c.user_avatar ? `${API}/${c.user_avatar}` : '/default-avatar.png'}
          style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          onError={e => { e.target.src = '/default-avatar.png'; }}
          alt=""
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: 2 }}>{c.username}</div>
          <div style={{ fontSize: '0.9rem', lineHeight: 1.4 }}>{c.content}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
            <button onClick={() => likeComment(c.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="fas fa-thumbs-up"></i> {c.likes || 0}
            </button>
            {depth < 2 && user && (
              <button onClick={() => setReplyTo(replyTo?.id === c.id ? null : { id: c.id, username: c.username })}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer' }}>
                <i className="fas fa-reply"></i> Ответить
              </button>
            )}
          </div>
          {replyTo?.id === c.id && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                className="comments-input"
                style={{ flex: 1, fontSize: '0.82rem' }}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={`Ответить ${c.username}…`}
                onKeyDown={e => e.key === 'Enter' && submit()}
                autoFocus
              />
              <button className="comments-submit" onClick={submit}><i className="fas fa-paper-plane"></i></button>
            </div>
          )}
        </div>
      </div>
      {c.replies?.map(r => renderComment(r, depth + 1))}
    </div>
  );

  return (
    <div className="clips-comments-overlay" onClick={onClose}>
      <div className="clips-comments-sheet" onClick={e => e.stopPropagation()}>
        <div className="comments-sheet-header">
          <span>Комментарии ({comments.reduce((a, c) => a + 1 + (c.replies?.length || 0), 0)})</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="comments-list">
          {comments.length === 0
            ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>Комментариев ещё нет</p>
            : comments.map(c => renderComment(c))}
        </div>
        {user ? (
          <div className="comments-input-area">
            <input
              className="comments-input"
              placeholder={replyTo ? `Ответить ${replyTo.username}…` : 'Написать комментарий…'}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !replyTo && submit()}
            />
            {replyTo && (
              <button onClick={() => { setReplyTo(null); setText(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                Отмена
              </button>
            )}
            <button className="comments-submit" onClick={submit}><i className="fas fa-paper-plane"></i></button>
          </div>
        ) : (
          <p style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Link href="/login" style={{ color: 'var(--accent)' }}>Войдите</Link>, чтобы комментировать
          </p>
        )}
      </div>
    </div>
  );
}

// ── Один слайд с видео ───────────────────────────────────────────────────────
function ClipSlide({ video, isActive }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true); // начинаем muted для autoplay
  const [showPlayIcon, setShowPlayIcon] = useState(false); // иконка паузы/плея
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [likes, setLikes] = useState(video.likes || 0);
  const [dislikes, setDislikes] = useState(video.dislikes || 0);
  const [showComments, setShowComments] = useState(false);
  const playIconTimer = useRef(null);
  const { user } = useAuthStore();

  // Autoplay когда слайд становится активным
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (isActive) {
      v.currentTime = 0;
      const tryPlay = () => {
        v.muted = true;
        setMuted(true);
        v.play()
          .then(() => {
            setPlaying(true);
            // После успешного запуска пробуем включить звук
            setTimeout(() => {
              v.muted = false;
              setMuted(false);
            }, 300);
          })
          .catch(() => {
            // Autoplay заблокирован — остаёмся muted
            v.muted = true;
            v.play().then(() => setPlaying(true)).catch(() => {});
          });
      };

      if (v.readyState >= 2) {
        tryPlay();
      } else {
        v.addEventListener('canplay', tryPlay, { once: true });
      }

      api.post(`/videos/${video.id}/view`).catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
      setPlaying(false);
    }

    return () => {
      if (playIconTimer.current) clearTimeout(playIconTimer.current);
    };
  }, [isActive]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;

    if (playIconTimer.current) clearTimeout(playIconTimer.current);

    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => {});
      setShowPlayIcon(false); // ничего не показываем при возобновлении (TikTok-стиль)
    } else {
      v.pause();
      setPlaying(false);
      setShowPlayIcon(true); // показываем иконку паузы
      // Иконка остаётся пока видео стоит на паузе
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await api.post(`/videos/${video.id}/like`);
      if (liked) { setLikes(l => l - 1); setLiked(false); }
      else { setLikes(l => l + 1); setLiked(true); if (disliked) { setDislikes(d => d - 1); setDisliked(false); } }
    } catch {}
  };

  const handleDislike = async (e) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await api.post(`/videos/${video.id}/dislike`);
      if (disliked) { setDislikes(d => d - 1); setDisliked(false); }
      else { setDislikes(d => d + 1); setDisliked(true); if (liked) { setLikes(l => l - 1); setLiked(false); } }
    } catch {}
  };

  const handleShare = (e) => {
    e.stopPropagation();
    if (navigator.share) navigator.share({ title: video.title, url: window.location.href }).catch(() => {});
    else { navigator.clipboard?.writeText(window.location.href).catch(() => {}); }
  };

  return (
    <div className="clip-slide" style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
      {/* Видео */}
      <video
        ref={videoRef}
        src={`${API}/${video.file_path}`}
        style={{
          height: '100%',
          width: '100%',
          maxWidth: '420px',
          objectFit: 'contain',
          display: 'block',
          cursor: 'pointer',
        }}
        loop
        playsInline
        muted={muted}
        preload="auto"
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* Иконка паузы (центр экрана, TikTok-стиль) */}
      {showPlayIcon && (
        <div
          onClick={togglePlay}
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 72, height: 72,
            background: 'rgba(0,0,0,0.55)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', color: 'white',
            cursor: 'pointer',
            zIndex: 10,
            animation: 'fadeInScale 0.15s ease',
          }}
        >
          <i className="fas fa-pause"></i>
        </div>
      )}

      {/* Кнопка звука — верхний правый угол */}
      <button
        onClick={toggleMute}
        style={{
          position: 'absolute', top: 14, right: 14,
          background: 'rgba(0,0,0,0.5)',
          border: 'none', color: 'white', borderRadius: '50%',
          width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: '0.85rem', zIndex: 10,
        }}
      >
        <i className={`fas ${muted ? 'fa-volume-mute' : 'fa-volume-up'}`}></i>
      </button>

      {/* Нижний оверлей — информация об артисте + название */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0,
        width: 'calc(100% - 70px)', // оставляем место для кнопок справа
        padding: '60px 16px 18px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
        pointerEvents: 'none',
        zIndex: 5,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, pointerEvents: 'auto' }}>
          <img
            src={video.artist_avatar ? `${API}/${video.artist_avatar}` : '/default-artist.jpg'}
            style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.7)' }}
            onError={e => { e.target.src = '/default-artist.jpg'; }}
            alt=""
          />
          <Link href={`/artist/${video.artist_id}`} style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none' }}>
            {video.artist_name}
          </Link>
        </div>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'white', marginBottom: 4, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
          {video.title}
        </div>
        {video.description && (
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.4, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
            {video.description}
          </div>
        )}
      </div>

      {/* Кнопки действий — правая сторона, вертикально */}
      <div style={{
        position: 'absolute',
        bottom: 24, right: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        zIndex: 10,
      }}>
        {/* Лайк */}
        <button onClick={handleLike} style={{ background: 'none', border: 'none', color: liked ? '#ff4d6d' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '50%', width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
            <i className={liked ? 'fas fa-heart' : 'far fa-heart'}></i>
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{formatCount(likes)}</span>
        </button>

        {/* Дизлайк */}
        <button onClick={handleDislike} style={{ background: 'none', border: 'none', color: disliked ? '#7b8cde' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '50%', width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
            <i className={disliked ? 'fas fa-thumbs-down' : 'far fa-thumbs-down'}></i>
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{formatCount(dislikes)}</span>
        </button>

        {/* Комментарии */}
        <button onClick={(e) => { e.stopPropagation(); setShowComments(true); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '50%', width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
            <i className="far fa-comment"></i>
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>Коменты</span>
        </button>

        {/* Поделиться */}
        <button onClick={handleShare} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '50%', width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
            <i className="fas fa-share"></i>
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>Поделиться</span>
        </button>
      </div>

      {showComments && <CommentsSheet videoId={video.id} onClose={() => setShowComments(false)} />}
    </div>
  );
}

// ── Главная страница клипов ──────────────────────────────────────────────────
export default function Clips() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const slideRefs = useRef([]);

  useEffect(() => {
    api.get('/videos/feed?limit=30')
      .then(r => setVideos(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // IntersectionObserver для определения активного слайда
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !videos.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = parseInt(entry.target.dataset.idx, 10);
            if (!isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      { root: el, threshold: 0.6 }
    );

    el.querySelectorAll('[data-idx]').forEach(s => observer.observe(s));
    return () => observer.disconnect();
  }, [videos]);

  // Высота: вычитаем header (~60px) и player bar (~90px)
  const containerH = 'calc(100vh - 60px - 90px)';

  return (
    <Layout>
      <div style={{ height: containerH, overflow: 'hidden', background: '#000', position: 'relative' }}>
        {loading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
          </div>
        ) : videos.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: 'var(--text-muted)' }}>
            <i className="fas fa-film" style={{ fontSize: '3rem', opacity: 0.4 }}></i>
            <p>Клипов пока нет</p>
          </div>
        ) : (
          <div
            ref={containerRef}
            style={{
              height: '100%',
              overflowY: 'scroll',
              scrollSnapType: 'y mandatory',
              scrollBehavior: 'smooth',
            }}
          >
            {videos.map((v, i) => (
              <div
                key={v.id}
                data-idx={i}
                style={{ height: containerH, scrollSnapAlign: 'start', flexShrink: 0 }}
              >
                <ClipSlide video={v} isActive={i === activeIndex} />
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.7); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </Layout>
  );
}
