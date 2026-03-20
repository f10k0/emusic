import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import usePlayerStore from '../store/playerStore';
import LikeButton from '../components/LikeButton';
import DownloadButton from '../components/DownloadButton';
import AddToPlaylistButton from '../components/AddToPlaylistButton';
import Link from 'next/link';

export default function SearchPage() {
  const router = useRouter();
  const { q } = router.query;
  const [results, setResults] = useState({ artists: [], albums: [], tracks: [] });
  const { setTrack, updateQueue } = usePlayerStore();

  useEffect(() => {
    if (q) {
      api.get(`/music/search?q=${encodeURIComponent(q)}`)
        .then(res => {
          setResults(res.data);
          updateQueue(res.data.tracks);
        })
        .catch(err => console.error(err));
    }
  }, [q]);

  const handlePlayTrack = (track) => {
    setTrack(track, results.tracks);
  };

  return (
    <Layout>
      <h2>Результаты поиска: {q}</h2>
      
      {results.tracks.length > 0 && (
        <div className="section">
          <h3>Треки</h3>
          <div className="track-list">
            {results.tracks.map(track => (
              <div key={track.id} className="track-item">
                <div className="track-info" onClick={() => handlePlayTrack(track)}>
                  <span className="track-number">▶</span>
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
                        <Link href={`/artist/${track.artist_id}`}>{track.artist_name}</Link>
                      ) : 'Неизвестный артист'}
                    </div>
                    <div className="track-play-count">
                      <i className="fas fa-headphones"></i> {track.play_count || 0}
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
        </div>
      )}
      
      {results.albums.length > 0 && (
        <div className="section">
          <h3>Альбомы</h3>
          <div className="card-grid">
            {results.albums.map(album => (
              <div key={album.id} className="card" style={{ position: 'relative' }}>
                <Link href={`/album/${album.id}`}>
                  <div className="card-image">
                    <img 
                      src={album.cover_image ? `${process.env.NEXT_PUBLIC_API_URL}/${album.cover_image}` : '/default-cover.png'} 
                      alt={album.title}
                      onError={(e) => { e.target.src = '/default-cover.png'; }}
                    />
                  </div>
                  <div className="card-title">{album.title}</div>
                  <div className="card-sub">
                    {album.artist_name && album.artist_id ? (
                      <Link href={`/artist/${album.artist_id}`}>{album.artist_name}</Link>
                    ) : 'Неизвестный артист'}
                  </div>
                </Link>
                <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
                  <LikeButton item={album} type="albums" initialState={album.liked} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {results.artists.length > 0 && (
        <div className="section">
          <h3>Артисты</h3>
          <div className="card-grid">
            {results.artists.map(artist => (
              <div key={artist.id} className="card" style={{ position: 'relative' }}>
                <Link href={`/artist/${artist.id}`}>
                  <div className="card-image">
                    <img 
                      src={artist.avatar ? `${process.env.NEXT_PUBLIC_API_URL}/${artist.avatar}` : '/default-avatar.png'} 
                      alt={artist.name}
                      onError={(e) => { e.target.src = '/default-avatar.png'; }}
                    />
                  </div>
                  <div className="card-title">{artist.name}</div>
                </Link>
                <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
                  <LikeButton item={artist} type="artists" initialState={artist.liked} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {results.tracks.length === 0 && results.albums.length === 0 && results.artists.length === 0 && q && (
        <p>Ничего не найдено</p>
      )}
    </Layout>
  );
}