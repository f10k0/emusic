import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import usePlayerStore from '../store/playerStore';
import LikeButton from '../components/LikeButton';
import DownloadButton from '../components/DownloadButton';
import AddToPlaylistButton from '../components/AddToPlaylistButton';
import Link from 'next/link';

// Выбранные жанры для отображения на главной (можно изменить)
const FEATURED_GENRES = ['Рэп', 'Рок', 'Поп', 'Электронная музыка'];

export default function Home() {
  const [tracks, setTracks] = useState([]);
  const [genres, setGenres] = useState([]);
  const [featuredGenres, setFeaturedGenres] = useState([]);
  const [chartTracks, setChartTracks] = useState([]);
  const { setTrack, updateQueue } = usePlayerStore();

  useEffect(() => {
    fetchTopTracks();
    fetchGenres();
    fetchChart();
  }, []);

  const fetchTopTracks = async () => {
    try {
      const res = await api.get('/music/top?limit=20');
      setTracks(res.data || []);
      updateQueue(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGenres = async () => {
    try {
      const res = await api.get('/genres');
      const allGenres = res.data || [];
      setGenres(allGenres);
      // Фильтруем выбранные жанры
      const featured = allGenres.filter(g => FEATURED_GENRES.includes(g.name));
      setFeaturedGenres(featured);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChart = async () => {
    try {
      const res = await api.get('/music/chart?limit=5');
      setChartTracks(res.data?.tracks || []);
    } catch (err) {
      console.error(err);
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
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'space-between' }}>
                <LikeButton item={track} type="tracks" initialState={track.liked} />
                <DownloadButton trackId={track.id} trackTitle={track.title} />
                                <AddToPlaylistButton trackId={track.id} trackTitle={track.title} />
                <button
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                  onClick={(e) => { e.stopPropagation(); addToQueue(track); }}
                  title="Добавить в очередь"
                >
                  <i className="fas fa-list-ol"></i>
                </button>
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
                <span className="track-number" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {getRankIcon(track.rank)}
                  {track.rank}
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
                <LikeButton item={track} type="tracks" initialState={track.liked} />
                <DownloadButton trackId={track.id} trackTitle={track.title} />
                                <AddToPlaylistButton trackId={track.id} trackTitle={track.title} />
                <button
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                  onClick={(e) => { e.stopPropagation(); addToQueue(track); }}
                  title="Добавить в очередь"
                >
                  <i className="fas fa-list-ol"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

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