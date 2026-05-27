import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import usePlayerStore from '../../store/playerStore';
import LikeButton from '../../components/LikeButton';
import DownloadButton from '../../components/DownloadButton';
import AddToPlaylistButton from '../../components/AddToPlaylistButton';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function formatDuration(sec) {
  if (!sec) return '—';
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

function parseLyrics(text) {
  if (!text) return [];
  return text.split('\n').map(line => {
    const m = line.match(/^\[(\d+):(\d+)\]\s*(.*)/);
    if (m) return { time: parseInt(m[1]) * 60 + parseInt(m[2]), text: m[3] };
    return { time: null, text: line };
  });
}

const MOOD_COLORS = {
  energetic: '#ff6b35', sad: '#6b8cff', romantic: '#ff6b8c',
  calm: '#35d4a0', aggressive: '#ff3535', dance: '#d435ff',
  nostalgic: '#ffa535', inspiring: '#35c4ff',
};

export default function TrackPage() {
  const router = useRouter();
  const { id } = router.query;
  const [track, setTrack] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setTrack: playTrack, currentTrack, isPlaying: storeIsPlaying, addToQueue, dynamicQueue, currentTime } = usePlayerStore();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/music/track/${id}`)
      .then(r => {
        setTrack(r.data);
        if (r.data.moods?.length > 0) {
          api.get(`/moods/${r.data.moods[0].slug}/tracks?limit=6`)
            .then(r2 => setRelated((r2.data || []).filter(t => t.id !== r.data.id).slice(0, 5)))
            .catch(() => {});
        }
      })
      .catch(() => setTrack(null))
      .finally(() => setLoading(false));
  }, [id]);

  // Compute activeLine before useEffect (track may be null, handle safely)
  const _lyrics = track ? parseLyrics(track.lyrics) : [];
  const _isCurrentTrack = track ? currentTrack?.id === track.id : false;
  const activeLine = _isCurrentTrack
    ? _lyrics.reduce((acc, line, i) => (line.time <= currentTime ? i : acc), -1)
    : -1;

  // Auto-scroll active lyric line into view — must be before any early returns
  useEffect(() => {
    if (activeLine < 0) return;
    const el = document.getElementById(`lyric-line-${activeLine}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLine]);

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2.5rem' }}></i>
        </div>
      </Layout>
    );
  }

  if (!track) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          <h2>Трек не найден</h2>
        </div>
      </Layout>
    );
  }

  const isCurrentTrack = _isCurrentTrack;
  const isPlaying = isCurrentTrack && storeIsPlaying;
  const lyrics = _lyrics;
  const isCurrentTrackPlaying = isCurrentTrack;

  return (
    <Layout>
      {/* Атмосферный блюр-фон из обложки */}
      {track.cover && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: `url(${API}/${track.cover})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'blur(60px) brightness(0.18)',
          transform: 'scale(1.1)',
        }} />
      )}

      {/* Основной контент */}
      <div style={{
        position: 'relative', zIndex: 1,
        minHeight: 'calc(100vh - 150px)',
        display: 'flex',
        alignItems: 'center',
        padding: '40px 48px',
      }}>
        <div style={{ width: '100%', maxWidth: 1500, margin: '0 auto' }}>

          {/* Грид: обложка слева, инфо справа */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.1fr',
            gap: 80,
            alignItems: 'center',
            marginBottom: track.lyrics || related.length > 0 ? 56 : 0,
          }}>

            {/* Обложка */}
            <div style={{
              width: '100%',
              aspectRatio: '1',
              borderRadius: 32,
              overflow: 'hidden',
              boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
              background: 'var(--bg-elevated)',
            }}>
              <img
                src={track.cover ? `${API}/${track.cover}` : '/default-cover.png'}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={e => { e.target.src = '/default-cover.png'; }}
                alt={track.title}
              />
            </div>

            {/* Инфо */}
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: '0.85rem', color: 'var(--text-muted)',
                marginBottom: 20, textTransform: 'uppercase',
                letterSpacing: '0.2em', fontWeight: 700,
              }}>
                Трек
              </div>

              <h1 style={{
                fontSize: 'clamp(3.5rem, 6vw, 7rem)',
                fontWeight: 900,
                marginBottom: 24,
                lineHeight: 1.0,
                color: 'var(--text-primary)',
                letterSpacing: '-0.03em',
                wordBreak: 'break-word',
              }}>
                {track.title}
              </h1>

              <Link href={`/artist/${track.artist_id}`} style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                color: 'var(--accent)', textDecoration: 'none',
                marginBottom: 32, fontSize: '1.6rem', fontWeight: 700,
              }}>
                <i className="fas fa-microphone-alt"></i>
                {track.artist_name}
              </Link>

              {/* Мета */}
              <div style={{
                display: 'flex', gap: 24, flexWrap: 'wrap',
                fontSize: '1.05rem', color: 'var(--text-muted)', marginBottom: 32,
              }}>
                <span>
                  <i className="fas fa-headphones" style={{ marginRight: 8 }}></i>
                  {(track.play_count || 0).toLocaleString()} прослушиваний
                </span>
                <span>
                  <i className="fas fa-clock" style={{ marginRight: 8 }}></i>
                  {formatDuration(track.duration)}
                </span>
                {track.is_adult && (
                  <span style={{
                    background: 'rgba(220,53,69,0.15)', color: '#dc3545',
                    padding: '5px 14px', borderRadius: 12, fontWeight: 700,
                  }}>
                    18+
                  </span>
                )}
              </div>

              {/* Настроения */}
              {track.moods?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 36 }}>
                  {track.moods.map(m => (
                    <span key={m.id} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '9px 20px', borderRadius: 30,
                      background: `${MOOD_COLORS[m.slug] || 'var(--accent)'}20`,
                      color: MOOD_COLORS[m.slug] || 'var(--accent)',
                      fontSize: '1rem', fontWeight: 700,
                      border: `1px solid ${MOOD_COLORS[m.slug] || 'var(--accent)'}45`,
                    }}>
                      {m.emoji && <i className={`fas ${m.emoji}`} style={{ fontSize: '0.85rem' }}></i>}
                      {m.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Действия */}
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn" onClick={() => playTrack(track, [track])}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 40px', fontSize: '1.15rem', fontWeight: 700 }}>
                  <i className={`fas ${isCurrentTrack && storeIsPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                  {isCurrentTrack && storeIsPlaying ? 'Сейчас играет' : isCurrentTrack ? 'На паузе' : 'Слушать'}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => addToQueue(track)}
                  style={{
                    padding: '16px 24px',
                    fontSize: '1.15rem',
                    color: dynamicQueue.some(t => t.id === track.id) ? 'var(--accent)' : undefined,
                    borderColor: dynamicQueue.some(t => t.id === track.id) ? 'var(--accent)' : undefined,
                    boxShadow: dynamicQueue.some(t => t.id === track.id) ? '0 0 12px rgba(136,51,255,0.3)' : undefined,
                  }}
                  title={dynamicQueue.some(t => t.id === track.id) ? 'В очереди' : 'Добавить в очередь'}
                >
                  <i className={`fas fa-list-ol ${dynamicQueue.some(t => t.id === track.id) ? 'in-queue' : ''}`}></i>
                </button>
                <LikeButton item={track} type="tracks" initialState={track.liked} />
                <DownloadButton trackId={track.id} trackTitle={track.title} />
                <AddToPlaylistButton trackId={track.id} trackTitle={track.title} />
              </div>
            </div>
          </div>

          {/* Нижний блок: текст + похожие */}
          {(track.lyrics || related.length > 0) && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: track.lyrics && related.length > 0 ? '1fr 1fr' : '1fr',
              gap: 28,
            }}>
              {track.lyrics && (
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 18, padding: 28, border: '1px solid var(--border)', position: 'relative' }}>
                  <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem', fontWeight: 700 }}>
                    <i className="fas fa-align-left" style={{ color: 'var(--accent)' }}></i>
                    Текст трека
                    {isCurrentTrackPlaying && (
                      <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className="fas fa-volume-up playing-indicator" style={{ fontSize: '0.7rem' }}></i>
                        синхронизировано
                      </span>
                    )}
                  </h3>
                  <div style={{ maxHeight: 380, overflowY: 'auto', paddingRight: 8 }} className="lyrics-scroll">
                    {lyrics.map((line, i) => {
                      const isActive = i === activeLine;
                      const isPast = i < activeLine;
                      const isFuture = i > activeLine;
                      return (
                        <div
                          key={i}
                          id={`lyric-line-${i}`}
                          onClick={() => line.time != null && isCurrentTrackPlaying
                            ? null
                            : undefined}
                          style={{
                            marginBottom: 2,
                            padding: '6px 10px',
                            borderRadius: 10,
                            fontSize: isActive ? '1.05rem' : '0.9rem',
                            lineHeight: 1.8,
                            fontWeight: isActive ? 700 : 400,
                            color: isActive
                              ? 'var(--text-primary)'
                              : isPast
                              ? 'var(--text-muted)'
                              : line.text ? 'var(--text-secondary)' : 'transparent',
                            background: isActive ? 'rgba(136,51,255,0.12)' : 'transparent',
                            borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                            transform: isActive ? 'scale(1.01)' : 'scale(1)',
                            transition: 'all 0.3s ease',
                            cursor: line.time != null ? 'default' : 'default',
                          }}
                        >
                          {line.text || ' '}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {related.length > 0 && (
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 18, padding: 28, border: '1px solid var(--border)' }}>
                  <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem', fontWeight: 700 }}>
                    <i className="fas fa-music" style={{ color: 'var(--accent)' }}></i>
                    Похожие треки
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {related.map(t => (
                      <div key={t.id}
                        style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', padding: '8px', borderRadius: 10, transition: 'background 0.15s' }}
                        onClick={() => playTrack(t, related)}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <img
                          src={t.cover ? `${API}/${t.cover}` : '/default-cover.png'}
                          style={{ width: 46, height: 46, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                          onError={e => { e.target.src = '/default-cover.png'; }}
                          alt=""
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
                            {t.title}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{t.artist_name}</div>
                        </div>
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', flexShrink: 0 }}>{formatDuration(t.duration)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}
