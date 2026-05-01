import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import api from '../lib/api';
import usePlayerStore from '../store/playerStore';
import LikeButton from '../components/LikeButton';
import DownloadButton from '../components/DownloadButton';
import AddToPlaylistButton from '../components/AddToPlaylistButton';
import Link from 'next/link';

export default function ChartPage() {
  const router = useRouter();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setTrack } = usePlayerStore();

  useEffect(() => {
    fetchChart();
  }, []);

  const fetchChart = async () => {
    try {
      const res = await api.get('/music/chart');
      setTracks(res.data?.tracks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: 'var(--accent)' }}></i>
          <p>Загрузка чарта...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="playlist-hero" style={{ marginBottom: '30px' }}>
        <div className="playlist-cover">
          <i className="fas fa-chart-line" style={{ fontSize: '4rem', color: 'white' }}></i>
        </div>
        <div className="playlist-info">
          <div className="playlist-badge">ТОП 100</div>
          <h2>Чарт</h2>
          <p className="playlist-desc">Самые популярные треки на платформе</p>
          <div className="playlist-stats">
            {tracks.length} треков • Общее количество прослушиваний: {tracks.reduce((sum, t) => sum + t.play_count, 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="track-list">
        {tracks.map(track => (
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
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}