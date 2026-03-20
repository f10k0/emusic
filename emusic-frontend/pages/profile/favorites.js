import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import usePlayerStore from '../../store/playerStore';
import ProtectedRoute from '../../components/ProtectedRoute';
import LikeButton from '../../components/LikeButton';
import DownloadButton from '../../components/DownloadButton';
import AddToPlaylistButton from '../../components/AddToPlaylistButton';
import Link from 'next/link';

export default function Favorites() {
  const router = useRouter();
  const { tab = 'tracks' } = router.query;
  const { user } = useAuthStore();
  const [tracks, setTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [artists, setArtists] = useState([]);
  const { setTrack, updateQueue } = usePlayerStore();

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user, tab]);

  const fetchFavorites = async () => {
    try {
      if (tab === 'tracks') {
        const res = await api.get('/favorites/tracks');
        setTracks(res.data.tracks || []);
        updateQueue(res.data.tracks || []);
      } else if (tab === 'albums') {
        const res = await api.get('/favorites/albums');
        setAlbums(res.data.albums || []);
      } else if (tab === 'artists') {
        const res = await api.get('/favorites/artists');
        setArtists(res.data.artists || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePlayTrack = (track) => {
    setTrack(track, tracks);
  };

  const handleToggle = (type, id, newState) => {
    if (!newState) {
      fetchFavorites();
    }
  };

  const changeTab = (newTab) => {
    router.push(`/profile/favorites?tab=${newTab}`, undefined, { shallow: true });
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="profile-container">
          <h2>Избранное</h2>
          <div className="tabs">
            <button className={tab === 'tracks' ? 'active' : ''} onClick={() => changeTab('tracks')}>Треки</button>
            <button className={tab === 'albums' ? 'active' : ''} onClick={() => changeTab('albums')}>Альбомы</button>
            <button className={tab === 'artists' ? 'active' : ''} onClick={() => changeTab('artists')}>Артисты</button>
          </div>

          {tab === 'tracks' && (
            <div className="track-list">
              {tracks.length === 0 ? (
                <p>У вас нет избранных треков</p>
              ) : (
                tracks.map(track => (
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
                      <LikeButton 
                        item={track} 
                        type="tracks" 
                        initialState={true} 
                        onToggle={(newState) => handleToggle('tracks', track.id, newState)}
                      />
                      <DownloadButton trackId={track.id} trackTitle={track.title} />
                      <AddToPlaylistButton trackId={track.id} trackTitle={track.title} />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'albums' && (
            <div className="card-grid">
              {albums.length === 0 ? (
                <p>У вас нет избранных альбомов</p>
              ) : (
                albums.map(album => (
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
                      <LikeButton 
                        item={album} 
                        type="albums" 
                        initialState={true} 
                        onToggle={(newState) => handleToggle('albums', album.id, newState)}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'artists' && (
            <div className="card-grid">
              {artists.length === 0 ? (
                <p>У вас нет избранных артистов</p>
              ) : (
                artists.map(artist => (
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
                      <LikeButton 
                        item={artist} 
                        type="artists" 
                        initialState={true} 
                        onToggle={(newState) => handleToggle('artists', artist.id, newState)}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}