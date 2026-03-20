import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import usePlayerStore from '../store/playerStore';
import LikeButton from '../components/LikeButton';
import DownloadButton from '../components/DownloadButton';
import AddToPlaylistButton from '../components/AddToPlaylistButton';
import Link from 'next/link';

export default function Home() {
  const [tracks, setTracks] = useState([]);
  const { setTrack, updateQueue } = usePlayerStore();

  useEffect(() => {
    api.get('/music/top?limit=20')
      .then(res => {
        const tracksData = Array.isArray(res.data) ? res.data : [];
        setTracks(tracksData);
        updateQueue(tracksData);
      })
      .catch(err => console.error(err));
  }, []);

  const handlePlay = (track) => {
    setTrack(track, tracks);
  };

  return (
    <Layout>
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}