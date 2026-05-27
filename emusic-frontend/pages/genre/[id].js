import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import usePlayerStore from '../../store/playerStore';
import LikeButton from '../../components/LikeButton';
import AddToPlaylistButton from '../../components/AddToPlaylistButton';
import DownloadButton from '../../components/DownloadButton';
import AddToPlaylistButton from '../../components/AddToPlaylistButton';
import Link from 'next/link';

export default function GenrePage() {
  const router = useRouter();
  const { id } = router.query;
  const [genre, setGenre] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setTrack, addToQueue, dynamicQueue, currentTrack, isPlaying: storeIsPlaying } = usePlayerStore();

  useEffect(() => {
    if (id) {
      fetchGenre();
      fetchTracks();
    }
  }, [id]);

  const fetchGenre = async () => {
    try {
      const res = await api.get(`/genres/${id}`);
      setGenre(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTracks = async () => {
    try {
      const res = await api.get(`/genres/${id}/tracks`);
      setTracks(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (track) => {
    setTrack(track, tracks);
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: 'var(--accent)' }}></i>
          <p>Загрузка жанра...</p>
        </div>
      </Layout>
    );
  }

  if (!genre) {
    return (
      <Layout>
        <div className="form-container">
          <h2>Жанр не найден</h2>
          <Link href="/" className="btn">Вернуться на главную</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="playlist-hero">
        <div className="playlist-cover">
          <img 
            src={genre.cover_image ? `${process.env.NEXT_PUBLIC_API_URL}/${genre.cover_image}` : '/default-genre.png'} 
            alt={genre.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '30px' }}
            onError={(e) => { e.target.src = '/default-genre.png'; }}
          />
        </div>
        <div className="playlist-info">
          <div className="playlist-badge">Жанр</div>
          <h2>{genre.name}</h2>
          <p className="playlist-desc">{genre.description || 'Популярные треки в этом жанре'}</p>
          <div className="playlist-stats">
            {tracks.length} треков
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Треки</h2>
        {tracks.length === 0 ? (
          <p>В этом жанре пока нет треков</p>
        ) : (
          <div className="track-list">
            {tracks.map((track, idx) => (
              <div key={track.id} className="track-item">
                <div className="track-info" onClick={() => handlePlay(track)}>
                  <span className="track-number">{idx + 1}</span>
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
                      <i className="fas fa-headphones"></i> {track.play_count || 0}
                    </div>
                  </div>
                </div>
                <div className="track-actions">
                  <button className="card-action-icon" onClick={e=>{e.stopPropagation();addToQueue(track);}} title="В очередь">
                    <i className={`fas fa-list-ol ${dynamicQueue.some(t=>t.id===track.id)?'in-queue':''}`}></i>
                  </button>
                  <LikeButton item={track} type="tracks" initialState={track.liked} />
                  <DownloadButton trackId={track.id} trackTitle={track.title} />
                  <AddToPlaylistButton trackId={track.id} trackTitle={track.title} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}