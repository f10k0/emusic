import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import usePlayerStore from '../store/playerStore';
import LikeButton from '../components/LikeButton';
import DownloadButton from '../components/DownloadButton';
import AddToPlaylistButton from '../components/AddToPlaylistButton';
import Link from 'next/link';

const MOOD_COLORS = { energetic:'#ff6b35', sad:'#6b8cff', romantic:'#ff6b8c', calm:'#35d4a0', aggressive:'#ff3535', dance:'#d435ff', nostalgic:'#ffa535', inspiring:'#35c4ff' };

// Выбранные жанры для отображения на главной (можно изменить)
const FEATURED_GENRES = ['Рэп', 'Рок', 'Поп', 'Электронная музыка'];

export default function Home() {
  const [tracks, setTracks] = useState([]);
  const [genres, setGenres] = useState([]);
  const [featuredGenres, setFeaturedGenres] = useState([]);
  const [chartTracks, setChartTracks] = useState([]);
  const [moods, setMoods] = useState([]);
  const [moodTracks, setMoodTracks] = useState({});
  const [selectedMood, setSelectedMood] = useState(null);
  const { setTrack, updateQueue, addToQueue, addNext, dynamicQueue, currentTrack, isPlaying: storeIsPlaying } = usePlayerStore();

  useEffect(() => {
    // Batch all fetches to avoid multiple re-renders
    Promise.all([
      api.get('/music/top?limit=20').catch(() => ({ data: [] })),
      api.get('/genres').catch(() => ({ data: [] })),
      api.get('/music/chart?limit=5').catch(() => ({ data: { tracks: [] } })),
      api.get('/moods/').catch(() => ({ data: [] })),
    ]).then(([topRes, genresRes, chartRes, moodsRes]) => {
      const topTracks = topRes.data || [];
      const allGenres = genresRes.data || [];
      const featured = allGenres.filter(g => FEATURED_GENRES.includes(g.name));
      // Single batched state update — one render only
      setTracks(topTracks);
      setGenres(allGenres);
      setFeaturedGenres(featured);
      setChartTracks(chartRes.data?.tracks || []);
      setMoods(moodsRes.data || []);
      updateQueue(topTracks);
    });
  }, []);

  const loadMoodTracks = async (mood) => {
    if (moodTracks[mood.slug]) {
      setSelectedMood(mood.slug === selectedMood ? null : mood.slug);
      return;
    }
    try {
      const res = await api.get(`/moods/${mood.slug}/tracks?limit=6`);
      setMoodTracks(prev => ({ ...prev, [mood.slug]: res.data || [] }));
      setSelectedMood(mood.slug);
    } catch {}
  };

  const playMoodPlaylist = (slug) => {
    const tracks = moodTracks[slug] || [];
    if (tracks.length > 0) {
      setTrack(tracks[0], tracks);
      updateQueue(tracks);
    }
  };



  const handlePlay = (track) => {
    setTrack(track, tracks);
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <i className="fas fa-crown" style={{ color: '#FFD700' }}></i>;
    if (rank === 2) return <i className="fas fa-crown" style={{ color: '#C0C0C0' }}></i>;
    if (rank === 3) return <i className="fas fa-crown" style={{ color: '#CD7F32' }}></i>;
    return null;
  };

  return (
    <Layout>
      {/* Популярные треки */}
      <div className="section">
        <h2>Популярные треки</h2>
        <div className="card-grid">
          {tracks.map(track => (
            <div key={track.id} className="card" onClick={() => handlePlay(track)}>
              <div className="card-image">
                <img 
                  src={track.cover ? `${process.env.NEXT_PUBLIC_API_URL}/${track.cover}` : '/default-cover.png'} 
                  alt={track.title}
                  onError={(e) => { e.target.src = '/default-cover.png'; }}
                />
                <button className="play-btn-small">
                  <i className="fas fa-play"></i>
                </button>
              </div>
              <div className="card-title">{track.title}</div>
              <div className="card-sub">
                {track.artist_name && track.artist_id ? (
                  <Link href={`/artist/${track.artist_id}`} onClick={(e) => e.stopPropagation()}>
                    {track.artist_name}
                  </Link>
                ) : 'Неизвестный артист'}
              </div>
              <div className="card-play-count">
                <i className="fas fa-headphones"></i> {track.play_count || 0}
              </div>
              <div className="card-actions">
                <LikeButton item={track} type="tracks" initialState={track.liked} />
                <DownloadButton trackId={track.id} trackTitle={track.title} />
                <AddToPlaylistButton trackId={track.id} trackTitle={track.title} />
                <button
                  className="card-action-icon"
                  onClick={(e) => { e.stopPropagation(); addToQueue(track); }}
                  title="Добавить в очередь"
                >
                  <i className={`fas fa-list-ol ${dynamicQueue.some(t => t.id === track.id) ? 'in-queue' : ''}`}></i>
                </button>
                <Link href={`/track/${track.id}`} onClick={e => e.stopPropagation()} style={{ textDecoration: 'none', display: 'inline-flex' }} title="Подробнее">
                  <i className="fas fa-info-circle" style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', cursor: 'pointer' }}></i>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Чарт */}
      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h2>Чарт</h2>
          <Link href="/chart" className="btn-secondary" style={{ padding: '5px 15px' }}>
            Весь чарт →
          </Link>
        </div>
        <div className="track-list">
          {chartTracks.map(track => (
            <div key={track.id} className="track-item">
              <div className="track-info" onClick={() => handlePlay(track)}>
                <span className="track-number" style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 40 }}>
                  {currentTrack?.id === track.id && storeIsPlaying
                    ? <i className="fas fa-volume-up playing-indicator"></i>
                    : <>{getRankIcon(track.rank)}{track.rank}</>}
                </span>
                <img 
                  src={track.cover ? `${process.env.NEXT_PUBLIC_API_URL}/${track.cover}` : '/default-cover.png'} 
                  className="track-thumb" 
                  alt={track.title}
                  onError={(e) => { e.target.src = '/default-cover.png'; }}
                />
                <div>
                  <div className="track-name">{track.title}</div>
                  <div className="track-artist">
                    {track.artist_name && track.artist_id ? (
                      <Link href={`/artist/${track.artist_id}`} onClick={(e) => e.stopPropagation()}>
                        {track.artist_name}
                      </Link>
                    ) : 'Неизвестный артист'}
                  </div>
                  <div className="track-play-count">
                    <i className="fas fa-headphones"></i> {track.play_count.toLocaleString()} прослушиваний
                  </div>
                </div>
              </div>
              <div className="track-actions">
                <button className="card-action-icon" onClick={(e)=>{e.stopPropagation();addToQueue(track);}} title="В очередь">
                  <i className={`fas fa-list-ol ${dynamicQueue.some(t=>t.id===track.id)?'in-queue':''}`}></i>
                </button>
                <LikeButton item={track} type="tracks" initialState={track.liked} />
                <DownloadButton trackId={track.id} trackTitle={track.title} />
                <AddToPlaylistButton trackId={track.id} trackTitle={track.title} />
                <Link href={`/track/${track.id}`} onClick={e=>e.stopPropagation()} className="card-action-icon" style={{ textDecoration: 'none' }} title="Страница трека">
                  <i className="fas fa-info-circle"></i>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Настроения */}
      {moods.length > 0 && (
        <div className="section">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,marginBottom:20}}>
            <h2>Треки по настроению</h2>
            {selectedMood && moodTracks[selectedMood]?.length > 0 && (
              <button className="btn" onClick={() => playMoodPlaylist(selectedMood)} style={{padding:'7px 18px',fontSize:'0.85rem',display:'flex',alignItems:'center',gap:7}}>
                <i className="fas fa-play"></i> Слушать плейлист
              </button>
            )}
          </div>
          {/* Кнопки настроений */}
          <div style={{display:'flex',flexWrap:'wrap',gap:10,marginBottom:20}}>
            {moods.map(mood => (
              <button key={mood.id} onClick={() => loadMoodTracks(mood)}
                style={{
                  padding:'8px 18px', borderRadius:24, border:`1px solid ${selectedMood===mood.slug ? MOOD_COLORS[mood.slug]||'var(--accent)' : 'var(--border)'}`,
                  background: selectedMood===mood.slug ? `${MOOD_COLORS[mood.slug]||'var(--accent)'}20` : 'var(--bg-elevated)',
                  color: selectedMood===mood.slug ? MOOD_COLORS[mood.slug]||'var(--accent)' : 'var(--text-secondary)',
                  cursor:'pointer', fontSize:'0.88rem', fontWeight: selectedMood===mood.slug ? 700 : 400,
                  display:'inline-flex',alignItems:'center',gap:6,transition:'all 0.2s',
                }}>
                {mood.emoji && <i className={`fas ${mood.emoji}`} style={{fontSize:'0.78rem'}}></i>}
                {mood.name}
              </button>
            ))}
          </div>
          {/* Треки выбранного настроения */}
          {selectedMood && moodTracks[selectedMood] && (
            <div className="track-list">
              {moodTracks[selectedMood].slice(0,6).map(track => (
                <div key={track.id} className="track-item">
                  <div className="track-info" onClick={() => setTrack(track, moodTracks[selectedMood])}>
                    <span className="track-number"><i className="fas fa-play" style={{fontSize:'0.75rem'}}></i></span>
                    <img src={track.cover ? `${process.env.NEXT_PUBLIC_API_URL}/${track.cover}` : '/default-cover.png'}
                      className="track-thumb" alt={track.title} onError={e=>e.target.src='/default-cover.png'}/>
                    <div>
                      <div className="track-name">{track.title}</div>
                      <div className="track-artist">
                        {track.artist_name && track.artist_id
                          ? <Link href={`/artist/${track.artist_id}`} onClick={e=>e.stopPropagation()}>{track.artist_name}</Link>
                          : 'Неизвестный артист'}
                      </div>
                    </div>
                  </div>
                  <div className="track-actions">
                    <button className="card-action-icon" onClick={e=>{e.stopPropagation();addToQueue(track);}} title="В очередь">
                      <i className={`fas fa-list-ol ${dynamicQueue.some(t=>t.id===track.id)?'in-queue':''}`}></i>
                    </button>
                    <LikeButton item={track} type="tracks" initialState={track.liked}/>
                    <DownloadButton trackId={track.id} trackTitle={track.title} />
                    <AddToPlaylistButton trackId={track.id} trackTitle={track.title} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {selectedMood && (!moodTracks[selectedMood] || moodTracks[selectedMood].length === 0) && (
            <p style={{color:'var(--text-muted)',textAlign:'center',padding:'20px 0'}}>Треков с этим настроением пока нет</p>
          )}
        </div>
      )}

      {/* Жанры (только выбранные) */}
      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h2>Жанры</h2>
          <Link href="/genres" className="btn-secondary" style={{ padding: '5px 15px' }}>
            Все жанры →
          </Link>
        </div>
        <div className="card-grid">
          {featuredGenres.map(genre => (
            <Link href={`/genre/${genre.id}`} key={genre.id} className="card" style={{ textAlign: 'center' }}>
              <div className="card-image"></div>
              <div className="card-title">{genre.name}</div>
              <div className="card-sub">{genre.description || 'Популярные треки в этом жанре'}</div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}