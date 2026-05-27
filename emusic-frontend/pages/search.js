import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import usePlayerStore from '../store/playerStore';
import LikeButton from '../components/LikeButton';
import DownloadButton from '../components/DownloadButton';
import AddToPlaylistButton from '../components/AddToPlaylistButton';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const MOOD_COLORS = { energetic:'#ff6b35', sad:'#6b8cff', romantic:'#ff6b8c', calm:'#35d4a0', aggressive:'#ff3535', dance:'#d435ff', nostalgic:'#ffa535', inspiring:'#35c4ff' };

function formatDuration(sec) {
  if (!sec) return '';
  return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
}

export default function SearchPage() {
  const router = useRouter();
  const { q } = router.query;
  const [results, setResults] = useState({ artists:[], albums:[], tracks:[], genres:[] });
  const [moods, setMoods] = useState([]);
  const [selectedMood, setSelectedMood] = useState('');
  const [moodTracks, setMoodTracks] = useState([]);
  const [loadingMood, setLoadingMood] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { setTrack, addToQueue, addNext, updateQueue, dynamicQueue, currentTrack, isPlaying: storeIsPlaying } = usePlayerStore();

  useEffect(() => {
    api.get('/moods/').then(r => setMoods(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (q) {
      api.get(`/music/search?q=${encodeURIComponent(q)}`)
        .then(res => { setResults(res.data); updateQueue(res.data.tracks); })
        .catch(() => {});
    }
  }, [q]);

  const handleMoodFilter = async (slug) => {
    if (selectedMood === slug) { setSelectedMood(''); setMoodTracks([]); return; }
    setSelectedMood(slug);
    setLoadingMood(true);
    try {
      const r = await api.get(`/moods/${slug}/tracks?limit=20`);
      setMoodTracks(r.data || []);
    } catch {} finally { setLoadingMood(false); }
  };

  const hasResults = results.tracks.length > 0 || results.albums.length > 0 || results.artists.length > 0;
  const showMoodResults = selectedMood && moodTracks.length > 0;
  const displayTracks = showMoodResults ? moodTracks : results.tracks;

  const TABS = [
    { id: 'all', label: 'Все' },
    { id: 'tracks', label: `Треки (${results.tracks.length})` },
    { id: 'artists', label: `Артисты (${results.artists.length})` },
    { id: 'albums', label: `Альбомы (${results.albums.length})` },
  ];

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Заголовок */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 4 }}>
            {q ? <>Результаты: <span style={{ color: 'var(--accent)' }}>«{q}»</span></> : 'Поиск'}
          </h2>
          {hasResults && <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Найдено: {results.tracks.length} треков, {results.artists.length} артистов, {results.albums.length} альбомов</p>}
        </div>

        {/* Фильтр по настроению */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            <i className="fas fa-smile" style={{ marginRight: 6 }}></i>Фильтр по настроению
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {moods.map(mood => (
              <button key={mood.id} onClick={() => handleMoodFilter(mood.slug)}
                style={{
                  padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: '0.83rem',
                  border: `1px solid ${selectedMood === mood.slug ? MOOD_COLORS[mood.slug]||'var(--accent)' : 'var(--border)'}`,
                  background: selectedMood === mood.slug ? `${MOOD_COLORS[mood.slug]||'var(--accent)'}20` : 'var(--bg-elevated)',
                  color: selectedMood === mood.slug ? MOOD_COLORS[mood.slug]||'var(--accent)' : 'var(--text-secondary)',
                  fontWeight: selectedMood === mood.slug ? 700 : 400,
                  display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
                }}>
                {mood.emoji && <i className={`fas ${mood.emoji}`} style={{ fontSize: '0.72rem' }}></i>}
                {mood.name}
              </button>
            ))}
            {selectedMood && (
              <button onClick={() => { setSelectedMood(''); setMoodTracks([]); }}
                style={{ padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: '0.83rem', background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <i className="fas fa-times" style={{ marginRight: 4 }}></i>Сбросить
              </button>
            )}
          </div>
          {showMoodResults && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>Треков по настроению: {moodTracks.length}</span>
              <button className="btn-secondary" onClick={() => { updateQueue(moodTracks); setTrack(moodTracks[0], moodTracks); }}
                style={{ padding: '5px 14px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <i className="fas fa-play"></i> Слушать всё
              </button>
            </div>
          )}
        </div>

        {/* Табы (только если есть результаты поиска) */}
        {q && hasResults && !selectedMood && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 1 }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
                  color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                  fontWeight: activeTab === tab.id ? 700 : 400, fontSize: '0.88rem',
                  borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                  marginBottom: -1, transition: 'all 0.15s',
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Треки */}
        {(activeTab === 'all' || activeTab === 'tracks') && displayTracks.length > 0 && (
          <div className="section">
            {!selectedMood && <h3 style={{ marginBottom: 12 }}>Треки</h3>}
            <div className="track-list">
              {displayTracks.map(track => (
                <div key={track.id} className="track-item">
                  <div className="track-info" onClick={() => setTrack(track, displayTracks)}>
                    <span className="track-number">{currentTrack?.id === track.id && storeIsPlaying ? <i className="fas fa-volume-up playing-indicator"></i> : <i className="fas fa-play" style={{ fontSize: '0.75rem' }}></i>}</span>
                    <img src={track.cover ? `${API}/${track.cover}` : '/default-cover.png'}
                      className="track-thumb" alt={track.title} onError={e => e.target.src = '/default-cover.png'}/>
                    <div>
                      <div className="track-name">{track.title}</div>
                      <div className="track-artist">
                        {track.artist_name && track.artist_id
                          ? <Link href={`/artist/${track.artist_id}`} onClick={e => e.stopPropagation()}>{track.artist_name}</Link>
                          : 'Неизвестный артист'}
                      </div>
                      {track.duration && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDuration(track.duration)}</div>}
                    </div>
                  </div>
                  <div className="track-actions" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Link href={`/track/${track.id}`} onClick={e => e.stopPropagation()} style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '4px 8px' }} title="Страница трека">
                      <i className="fas fa-info-circle"></i>
                    </Link>
                    <LikeButton item={track} type="tracks" initialState={track.liked}/>
                    <DownloadButton trackId={track.id} trackTitle={track.title}/>
                    <AddToPlaylistButton trackId={track.id} trackTitle={track.title}/>
                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: 6 }}
                      onClick={e => { e.stopPropagation(); addToQueue(track); }} title="В очередь">
                      <i className="fas fa-list-ol"></i>
                    </button>
                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: 6 }}
                      onClick={e => { e.stopPropagation(); addNext(track); }} title="Следующим">
                      <i className="fas fa-step-forward"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Артисты */}
        {(activeTab === 'all' || activeTab === 'artists') && results.artists.length > 0 && !selectedMood && (
          <div className="section">
            <h3 style={{ marginBottom: 12 }}>Артисты</h3>
            <div className="card-grid">
              {results.artists.map(artist => (
                <div key={artist.id} className="card" style={{ position: 'relative' }}>
                  <Link href={`/artist/${artist.id}`}>
                    <div className="card-image">
                      <img src={artist.avatar ? `${API}/${artist.avatar}` : '/default-avatar.png'} alt={artist.name} onError={e => e.target.src = '/default-avatar.png'}/>
                    </div>
                    <div className="card-title">{artist.name}</div>
                  </Link>
                  <div style={{ position: 'absolute', top: 12, right: 12 }}>
                    <LikeButton item={artist} type="artists" initialState={artist.liked}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Альбомы */}
        {(activeTab === 'all' || activeTab === 'albums') && results.albums.length > 0 && !selectedMood && (
          <div className="section">
            <h3 style={{ marginBottom: 12 }}>Альбомы</h3>
            <div className="card-grid">
              {results.albums.map(album => (
                <div key={album.id} className="card" style={{ position: 'relative' }}>
                  <Link href={`/album/${album.id}`}>
                    <div className="card-image">
                      <img src={album.cover_image ? `${API}/${album.cover_image}` : '/default-cover.png'} alt={album.title} onError={e => e.target.src = '/default-cover.png'}/>
                    </div>
                    <div className="card-title">{album.title}</div>
                    <div className="card-sub">{album.artist_name}</div>
                  </Link>
                  <div style={{ position: 'absolute', top: 12, right: 12 }}>
                    <LikeButton item={album} type="albums" initialState={album.liked}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Жанры */}
        {(activeTab === 'all') && results.genres?.length > 0 && !selectedMood && (
          <div className="section">
            <h3 style={{ marginBottom: 12 }}>Жанры</h3>
            <div className="card-grid">
              {results.genres.map(genre => (
                <Link href={`/genre/${genre.id}`} key={genre.id} className="card" style={{ textAlign: 'center' }}>
                  <div className="card-image"></div>
                  <div className="card-title">{genre.name}</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Пусто */}
        {loadingMood && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem' }}></i></div>}
        {!loadingMood && !hasResults && !showMoodResults && q && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <i className="fas fa-search" style={{ fontSize: '3rem', opacity: 0.3, display: 'block', marginBottom: 16 }}></i>
            <p>Ничего не найдено по запросу «{q}»</p>
          </div>
        )}
        {!q && !selectedMood && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <i className="fas fa-search" style={{ fontSize: '3rem', opacity: 0.2, display: 'block', marginBottom: 16 }}></i>
            <p>Введите запрос в строку поиска или выберите настроение выше</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
