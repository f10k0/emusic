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

// ── Лист комментариев ─────────────────────────────────────────────────────────
function CommentsSheet({ videoId, onClose }) {
  const [comments, setComments] = useState([]);
  const [mainText, setMainText] = useState('');
  const [replyState, setReplyState] = useState(null); // { id, username, text }
  const { user } = useAuthStore();

  const loadComments = useCallback(() => {
    api.get(`/videos/${videoId}/comments`).then(r => setComments(r.data || [])).catch(() => {});
  }, [videoId]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const submitMain = async () => {
    if (!mainText.trim() || !user) return;
    const fd = new FormData();
    fd.append('content', mainText);
    try {
      await api.post(`/videos/${videoId}/comments`, fd);
      setMainText('');
      loadComments();
    } catch {}
  };

  const submitReply = async () => {
    if (!replyState?.text?.trim() || !user) return;
    const fd = new FormData();
    fd.append('content', replyState.text);
    fd.append('parent_id', replyState.id);
    try {
      await api.post(`/videos/${videoId}/comments`, fd);
      setReplyState(null);
      loadComments();
    } catch {}
  };

  const likeComment = async (cid) => {
    try { await api.post(`/videos/comments/${cid}/like`); loadComments(); } catch {}
  };

  const deleteComment = async (cid) => {
    try { await api.delete(`/videos/comments/${cid}`); loadComments(); } catch {}
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: 2 }}>{c.username}</div>
          <div style={{ fontSize: '0.9rem', lineHeight: 1.4, wordBreak: 'break-word' }}>{c.content}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
            <button onClick={() => likeComment(c.id)}
              style={{ background: 'none', border: 'none', color: c.liked ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              <i className="fas fa-thumbs-up"></i> {c.likes || 0}
            </button>
            {depth < 2 && user && (
              <button
                onClick={() => setReplyState(replyState?.id === c.id ? null : { id: c.id, username: c.username, text: '' })}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer' }}>
                <i className="fas fa-reply"></i> Ответить
              </button>
            )}
            {user && (user.id === c.user_id || user.role === 'admin') && (
              <button onClick={() => deleteComment(c.id)}
                style={{ background: 'none', border: 'none', color: '#ff6b6b', fontSize: '0.78rem', cursor: 'pointer' }}>
                <i className="fas fa-trash"></i>
              </button>
            )}
          </div>
          {/* Поле ответа — только если replyState.id === c.id */}
          {replyState?.id === c.id && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                className="comments-input"
                style={{ flex: 1, fontSize: '0.82rem' }}
                value={replyState.text}
                onChange={e => setReplyState(s => ({ ...s, text: e.target.value }))}
                placeholder={`Ответить ${c.username}…`}
                onKeyDown={e => e.key === 'Enter' && submitReply()}
                autoFocus
              />
              <button className="comments-submit" onClick={submitReply}>
                <i className="fas fa-paper-plane"></i>
              </button>
              <button onClick={() => setReplyState(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Вложенные ответы */}
      {c.replies?.map(r => renderComment(r, depth + 1))}
    </div>
  );

  const total = comments.reduce((a, c) => a + 1 + (c.replies?.length || 0), 0);

  return (
    <div className="clips-comments-overlay" onClick={onClose}>
      <div className="clips-comments-sheet" onClick={e => e.stopPropagation()}>
        <div className="comments-sheet-header">
          <span>Комментарии ({total})</span>
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
              placeholder="Написать комментарий…"
              value={mainText}
              onChange={e => setMainText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitMain()}
            />
            <button className="comments-submit" onClick={submitMain}>
              <i className="fas fa-paper-plane"></i>
            </button>
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

// ── Один слайд ────────────────────────────────────────────────────────────────
function ClipSlide({ video: initialVideo, isActive }) {
  const videoRef = useRef(null);
  const [video, setVideo] = useState(initialVideo);
  const [playing, setPlaying] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const { user } = useAuthStore();

  // Autoplay когда слайд активен
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.currentTime = 0;
      v.muted = true;
      setMuted(true);
      const tryPlay = () => {
        v.play()
          .then(() => {
            setPlaying(true);
            setTimeout(() => {
              v.muted = false;
              v.volume = volume;
              setMuted(false);
            }, 200);
          })
          .catch(() => {
            v.muted = true;
            v.play().then(() => setPlaying(true)).catch(() => {});
          });
      };
      if (v.readyState >= 2) tryPlay();
      else v.addEventListener('canplay', tryPlay, { once: true });
      api.post(`/videos/${video.id}/view`).catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
      setPlaying(false);
      setShowPauseIcon(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => { setPlaying(true); setShowPauseIcon(false); }).catch(() => {});
    } else {
      v.pause();
      setPlaying(false);
      setShowPauseIcon(true);
    }
  };

  const handleVolumeChange = (val) => {
    const v = videoRef.current;
    const newVol = parseFloat(val);
    setVolume(newVol);
    if (v) {
      v.volume = newVol;
      v.muted = newVol === 0;
      setMuted(newVol === 0);
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.muted || volume === 0) {
      const newVol = volume > 0 ? volume : 0.8;
      v.muted = false;
      v.volume = newVol;
      setVolume(newVol);
      setMuted(false);
    } else {
      v.muted = true;
      setMuted(true);
    }
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const r = await api.post(`/videos/${video.id}/like`);
      setVideo(v => ({ ...v, likes: r.data.likes, dislikes: r.data.dislikes, liked: r.data.liked, disliked: r.data.disliked }));
    } catch {}
  };

  const handleDislike = async (e) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const r = await api.post(`/videos/${video.id}/dislike`);
      setVideo(v => ({ ...v, likes: r.data.likes, dislikes: r.data.dislikes, liked: r.data.liked, disliked: r.data.disliked }));
    } catch {}
  };

  const handleShare = (e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden' }}>
      {/* Видео — занимает весь слайд, сохраняя пропорции */}
      <video
        ref={videoRef}
        src={`${API}/${video.file_path}`}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',   // contain чтобы не обрезать горизонтальное видео
          cursor: 'pointer',
          zIndex: 1,
        }}
        loop
        playsInline
        muted={muted}
        preload="auto"
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* Иконка паузы по центру */}
      {showPauseIcon && (
        <div
          onClick={togglePlay}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 80, height: 80,
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.2rem', color: 'white',
            zIndex: 10,
            animation: 'fadeInScale 0.15s ease',
            cursor: 'pointer',
          }}
        >
          <i className="fas fa-pause"></i>
        </div>
      )}

      {/* Громкость — верхний правый угол */}
      <div
        style={{ position: 'absolute', top: 14, right: 14, zIndex: 20, display: 'flex', alignItems: 'center', gap: 6 }}
        onMouseEnter={() => setShowVolumeSlider(true)}
        onMouseLeave={() => setShowVolumeSlider(false)}
      >
        {showVolumeSlider && (
          <input
            type="range" min="0" max="1" step="0.05"
            value={muted ? 0 : volume}
            onChange={e => handleVolumeChange(e.target.value)}
            onClick={e => e.stopPropagation()}
            style={{ width: 80, accentColor: 'white', cursor: 'pointer' }}
          />
        )}
        <button
          onClick={toggleMute}
          style={{
            background: 'rgba(0,0,0,0.55)', border: 'none', color: 'white',
            borderRadius: '50%', width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          <i className={`fas ${muted ? 'fa-volume-mute' : volume < 0.5 ? 'fa-volume-down' : 'fa-volume-up'}`}></i>
        </button>
      </div>

      {/* Нижний градиент + информация */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0,
        width: 'calc(100% - 70px)',
        padding: '80px 16px 20px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 70%, transparent 100%)',
        zIndex: 5,
        pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, pointerEvents: 'auto' }}>
          <img
            src={video.artist_avatar ? `${API}/${video.artist_avatar}` : '/default-artist.jpg'}
            style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.7)', flexShrink: 0 }}
            onError={e => { e.target.src = '/default-artist.jpg'; }}
            alt=""
          />
          <Link href={`/artist/${video.artist_id}`} style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
            {video.artist_name}
          </Link>
        </div>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'white', marginBottom: 4, textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
          {video.title}
        </div>
        {video.description && (
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
            {video.description}
          </div>
        )}
      </div>

      {/* Кнопки действий — правая вертикальная колонка */}
      <div style={{
        position: 'absolute', bottom: 24, right: 12,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        zIndex: 10,
      }}>
        <ActionBtn icon={video.liked ? 'fas fa-heart' : 'far fa-heart'} label={formatCount(video.likes)}
          color={video.liked ? '#ff4d6d' : 'white'} onClick={handleLike} />
        <ActionBtn icon={video.disliked ? 'fas fa-thumbs-down' : 'far fa-thumbs-down'} label={formatCount(video.dislikes)}
          color={video.disliked ? '#7b8cde' : 'white'} onClick={handleDislike} />
        <ActionBtn icon="far fa-comment" label="Коменты"
          onClick={e => { e.stopPropagation(); setShowComments(true); }} />
        <ActionBtn icon="fas fa-share" label="Поделиться" onClick={handleShare} />
      </div>

      {showComments && <CommentsSheet videoId={video.id} onClose={() => setShowComments(false)} />}

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
}

function ActionBtn({ icon, label, color = 'white', onClick }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', color, cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    }}>
      <div style={{
        background: 'rgba(0,0,0,0.45)', borderRadius: '50%',
        width: 46, height: 46,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.3rem', transition: 'transform 0.15s',
      }}>
        <i className={icon}></i>
      </div>
      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
        {label}
      </span>
    </button>
  );
}

// ── Главная страница клипов ────────────────────────────────────────────────────
export default function Clips() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    api.get('/videos/feed?limit=30')
      .then(r => setVideos(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !videos.length) return;
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) setActiveIndex(parseInt(e.target.dataset.idx, 10));
      }),
      { root: el, threshold: 0.55 }
    );
    el.querySelectorAll('[data-idx]').forEach(s => observer.observe(s));
    return () => observer.disconnect();
  }, [videos]);

  return (
    <Layout fullscreen>
      <div style={{
        flex: 1,
        background: '#000',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}>
        {loading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
          </div>
        ) : videos.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: '#888' }}>
            <i className="fas fa-film" style={{ fontSize: '3rem', opacity: 0.3 }}></i>
            <p>Клипов пока нет</p>
          </div>
        ) : (
          <div
            ref={containerRef}
            style={{ flex: 1, overflowY: 'scroll', scrollSnapType: 'y mandatory', minHeight: 0 }}
          >
            {videos.map((v, i) => (
              <div key={v.id} data-idx={i} style={{ height: '100%', scrollSnapAlign: 'start', flexShrink: 0, minHeight: '100%' }}>
                <ClipSlide video={v} isActive={i === activeIndex} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
