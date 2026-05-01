import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import usePlayerStore from '../../store/playerStore';
import LikeButton from '../../components/LikeButton';
import DownloadButton from '../../components/DownloadButton';
import Link from 'next/link';

export default function AlbumPage() {
  const router = useRouter();
  const { id } = router.query;
  const [album, setAlbum] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setTrack } = usePlayerStore();

  useEffect(() => {
    if (id) {
      fetchAlbum();
    }
  }, [id]);

  const fetchAlbum = async () => {
    try {
      const res = await api.get(`/albums/${id}`);
      setAlbum(res.data);
      setTracks(res.data.tracks || []);
    } catch (err) {
      console.error('Ошибка загрузки альбома:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayTrack = (track) => {
    setTrack(track, tracks);
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: 'var(--accent)' }}></i>
          <p style={{ marginTop: '16px' }}>Загрузка альбома...</p>
        </div>
      </Layout>
    );
  }

  if (!album) {
    return (
      <Layout>
        <div className="form-container">
          <h2>Альбом не найден</h2>
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
            src={album.cover_image ? `${process.env.NEXT_PUBLIC_API_URL}/${album.cover_image}` : '/default-cover.png'} 
            alt={album.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '30px' }}
            onError={(e) => { e.target.src = '/default-cover.png'; }}
          />
        </div>
        <div className="playlist-info">
          <div className="playlist-badge">{album.type === 'album' ? 'Альбом' : 'Сингл'}</div>
          <h2>{album.title}</h2>
          <p className="playlist-artist">
            <Link href={`/artist/${album.artist_id}`} style={{ color: 'var(--accent-light)' }}>
              {album.artist_name || 'Неизвестный артист'}
            </Link>
          </p>
          <div className="playlist-stats">
            {album.release_date && new Date(album.release_date).getFullYear()} • {tracks.length} треков
          </div>
          <div style={{ marginTop: '15px' }}>
            <LikeButton item={album} type="albums" initialState={album.liked} />
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Треки</h2>
        {tracks.length === 0 ? (
          <p>В этом альбоме пока нет треков</p>
        ) : (
          <div className="track-list">
            {tracks.map((track, index) => (
              <div key={track.id} className="track-item">
                <div className="track-info" onClick={() => handlePlayTrack(track)}>
                  <span className="track-number">{index + 1}</span>
                  <img 
                    src={track.cover ? `${process.env.NEXT_PUBLIC_API_URL}/${track.cover}` : '/default-cover.png'} 
                    className="track-thumb" 
                    alt={track.title}
                    onError={(e) => { e.target.src = '/default-cover.png'; }}
                  />
                  <div>
                    <div className="track-name">{track.title}</div>
                    <div className="track-artist">
                      <Link href={`/artist/${album.artist_id}`}>{album.artist_name}</Link>
                    </div>
                  </div>
                </div>
                <div className="track-actions">
                  <LikeButton item={track} type="tracks" initialState={track.liked} />
                  <DownloadButton trackId={track.id} trackTitle={track.title} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}