import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import Link from 'next/link';

function formatCount(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function CommentsSheet({ videoId, onClose }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const { user } = useAuthStore();
  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    api.get(`/videos/${videoId}/comments`).then(r => setComments(r.data)).catch(() => {});
  }, [videoId]);

  const submit = async () => {
    if (!text.trim() || !user) return;
    const fd = new FormData();
    fd.append('content', text);
    if (replyTo) fd.append('parent_id', replyTo);
    try {
      const r = await api.post(`/videos/${videoId}/comments`, fd);
      setComments(prev => replyTo ? prev : [...prev, r.data]);
      setText(''); setReplyTo(null);
      if (replyTo) {
        const fresh = await api.get(`/videos/${videoId}/comments`);
        setComments(fresh.data);
      }
    } catch {}
  };

  const likeComment = async (cid) => {
    try { await api.post(`/videos/comments/${cid}/like`); } catch {}
    const fresh = await api.get(`/videos/${videoId}/comments`);
    setComments(fresh.data);
  };

  const renderComment = (c, depth = 0) => (
    <div key={c.id} className="comment-item" style={{ marginLeft: depth * 20 }}>
      <img
        src={c.user_avatar ? `${API}/${c.user_avatar}` : '/default-avatar.png'}
        className="comment-avatar"
        onError={e => { e.target.src = '/default-avatar.png'; }}
        alt=""
      />
      <div className="comment-body">
        <div className="comment-username">{c.username}</div>
        <div className="comment-text">{c.content}</div>
        <div className="comment-actions">
          <button className="comment-btn" onClick={() => likeComment(c.id)}>
            <i className="fas fa-thumbs-up"></i> {c.likes || 0}
          </button>
          {depth < 3 && user && (
            <button className="comment-btn" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}>
              <i className="fas fa-reply"></i> Ответить
            </button>
          )}
        </div>
        {replyTo === c.id && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input className="comments-input" style={{ flex: 1, fontSize: '0.82rem' }}
              value={text} onChange={e => setText(e.target.value)}
              placeholder={`Ответить ${c.username}…`}
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
            <button className="comments-submit" onClick={submit}><i className="fas fa-paper-plane"></i></button>
          </div>
        )}
        {c.replies && c.replies.length > 0 && (
          <div className="comment-replies">
            {c.replies.map(r => renderComment(r, depth + 1))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="clips-comments-overlay" onClick={onClose}>
      <div className="clips-comments-sheet" onClick={e => e.stopPropagation()}>
        <div className="comments-sheet-header">
          <span>Комментарии</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="comments-list">
          {comments.length === 0
            ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>Комментариев нет</p>
            : comments.map(c => renderComment(c))}
        </div>
        {user ? (
          <div className="comments-input-area">
            <input
              className="comments-input"
              placeholder="Написать комментарий…"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !replyTo && submit()}
            />
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

function ClipSlide({ video, isVisible }) {
  const videoRef = useRef(null);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [likes, setLikes] = useState(video.likes || 0);
  const [dislikes, setDislikes] = useState(video.dislikes || 0);
  const [showComments, setShowComments] = useState(false);
  const [muted, setMuted] = useState(false);
  const { user } = useAuthStore();
  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isVisible) {
      v.play().catch(() => { setMuted(true); v.muted = true; v.play().catch(() => {}); });
      api.post(`/videos/${video.id}/view`).catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [isVisible]);

  const handleLike = async () => {
    if (!user) return;
    try {
      await api.post(`/videos/${video.id}/like`);
      setLikes(l => l + (liked ? -1 : 1));
      setLiked(v => !v);
      if (disliked) setDisliked(false);
    } catch {}
  };

  const handleDislike = async () => {
    if (!user) return;
    try {
      await api.post(`/videos/${video.id}/dislike`);
      setDislikes(d => d + (disliked ? -1 : 1));
      setDisliked(v => !v);
      if (liked) setLiked(false);
    } catch {}
  };

  return (
    <div className="clip-slide">
      <video
        ref={videoRef}
        src={`${API}/${video.file_path}`}
        className="clip-video"
        loop
        playsInline
        muted={muted}
        onClick={() => {
          const v = videoRef.current;
          if (!v) return;
          v.paused ? v.play().catch(() => {}) : v.pause();
        }}
      />
      {muted && (
        <button
          onClick={() => { setMuted(false); if (videoRef.current) videoRef.current.muted = false; }}
          style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: '0.9rem' }}
        >
          <i className="fas fa-volume-mute"></i>
        </button>
      )}
      <div className="clip-overlay">
        <div className="clip-info">
          <div className="clip-artist">
            <img
              src={video.artist_avatar ? `${API}/${video.artist_avatar}` : '/default-artist.jpg'}
              className="clip-artist-avatar"
              onError={e => { e.target.src = '/default-artist.jpg'; }}
              alt=""
            />
            <Link href={`/artist/${video.artist_id}`} className="clip-artist-name">{video.artist_name}</Link>
          </div>
          <div className="clip-title">{video.title}</div>
          {video.description && <div className="clip-desc">{video.description}</div>}
        </div>
        <div className="clip-actions">
          <button className={`clip-action-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
            <i className={`fas fa-heart`}></i>
            <span>{formatCount(likes)}</span>
          </button>
          <button className={`clip-action-btn ${disliked ? 'liked' : ''}`} onClick={handleDislike}>
            <i className="fas fa-thumbs-down"></i>
            <span>{formatCount(dislikes)}</span>
          </button>
          <button className="clip-action-btn" onClick={() => setShowComments(true)}>
            <i className="fas fa-comment"></i>
            <span>Коменты</span>
          </button>
          <button className="clip-action-btn" onClick={() => {
            if (navigator.share) navigator.share({ title: video.title, url: window.location.href }).catch(() => {});
          }}>
            <i className="fas fa-share"></i>
            <span>Поделиться</span>
          </button>
        </div>
      </div>
      {showComments && <CommentsSheet videoId={video.id} onClose={() => setShowComments(false)} />}
    </div>
  );
}

export default function Clips() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    api.get('/videos/feed?limit=30').then(r => setVideos(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = parseInt(entry.target.dataset.idx);
            setActiveIndex(idx);
          }
        });
      },
      { root: el, threshold: 0.6 }
    );
    el.querySelectorAll('.clip-slide').forEach(s => observer.observe(s));
    return () => observer.disconnect();
  }, [videos]);

  return (
    <Layout>
      <div style={{ padding: '0', height: 'calc(100vh - 90px)', overflow: 'hidden' }}>
        <div ref={containerRef} className="clips-page">
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
            </div>
          ) : videos.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, color: 'var(--text-muted)' }}>
              <i className="fas fa-film" style={{ fontSize: '3rem' }}></i>
              <p>Клипов пока нет</p>
            </div>
          ) : (
            videos.map((v, i) => (
              <div key={v.id} data-idx={i}>
                <ClipSlide video={v} isVisible={i === activeIndex} />
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
