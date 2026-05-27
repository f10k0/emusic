import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import usePlayerStore from '../../store/playerStore';
import LikeButton from '../../components/LikeButton';
import DownloadButton from '../../components/DownloadButton';
import AddToPlaylistButton from '../../components/AddToPlaylistButton';
import Link from 'next/link';

export default function PlaylistDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuthStore();
  const { setTrack, addToQueue, dynamicQueue, currentTrack, isPlaying: storeIsPlaying } = usePlayerStore();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', is_public: true });
  const [saving, setSaving] = useState(false);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  useEffect(() => {
    if (id) {
      fetchPlaylist();
    }
  }, [id]);

  useEffect(() => {
    if (playlist && user) {
      setIsOwner(playlist.user_id === user.id);
      setEditForm({ name: playlist.name, description: playlist.description || '', is_public: playlist.is_public });
    }
  }, [playlist, user]);

  const fetchPlaylist = async () => {
    try {
      const res = await api.get(`/playlists/${id}`);
      setPlaylist(res.data);
    } catch (err) {
      console.error('Ошибка загрузки плейлиста:', err);
      if (err.response?.status === 403) {
        alert('Этот плейлист приватный');
        router.push('/playlists');
      }
    } finally {
      setLoading(false);
    }
  };


  const savePlaylist = async () => {
    setSaving(true);
    try {
      await api.put(`/playlists/${id}`, editForm);
      if (coverFile) {
        const fd = new FormData();
        fd.append('file', coverFile);
        await api.post(`/playlists/${id}/cover`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).catch(() => {});
      }
      await fetchPlaylist();
      setEditMode(false);
      setCoverFile(null);
      setCoverPreview(null);
    } catch {}
    setSaving(false);
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };
  const handlePlayTrack = (track) => {
    setTrack(track, playlist.tracks);
  };

  const handleRemoveTrack = async (trackId) => {
    if (!isOwner) return;
    try {
      await api.delete(`/playlists/${id}/tracks/${trackId}`);
      fetchPlaylist();
    } catch (err) {
      console.error('Ошибка удаления трека:', err);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: 'var(--accent)' }}></i>
        </div>
      </Layout>
    );
  }

  if (!playlist) {
    return (
      <Layout>
        <div className="form-container">
          <h2>Плейлист не найден</h2>
          <Link href="/playlists" className="btn">Вернуться к плейлистам</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="playlist-hero">
        <div className="playlist-cover">
          {playlist.cover_image ? (
            <img
              src={`${process.env.NEXT_PUBLIC_API_URL}/${playlist.cover_image}`}
              alt={playlist.name}
              style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'30px' }}
              onError={e => { e.target.style.display='none'; }}
            />
          ) : (
            <div style={{
              width:'100%', height:'100%',
              background:'var(--accent-gradient)',
              borderRadius:'30px',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <i className="fas fa-music" style={{ fontSize:'4rem', color:'rgba(255,255,255,0.8)' }}></i>
            </div>
          )}
        </div>
        <div className="playlist-info">
          <div className="playlist-badge">Плейлист</div>
          {editMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              <input
                className="form-control"
                value={editForm.name}
                onChange={e => setEditForm(s => ({ ...s, name: e.target.value }))}
                placeholder="Название плейлиста"
                style={{ fontSize: '1.3rem', fontWeight: 700, padding: '10px 14px', borderRadius: 12 }}
              />
              <textarea
                className="form-control"
                value={editForm.description}
                onChange={e => setEditForm(s => ({ ...s, description: e.target.value }))}
                placeholder="Описание"
                rows={2}
                style={{ padding: '10px 14px', borderRadius: 12, resize: 'vertical' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={editForm.is_public} onChange={e => setEditForm(s => ({ ...s, is_public: e.target.checked }))} />
                Публичный плейлист
              </label>
              <div style={{ marginTop: 4 }}>
                <label style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--accent)' }}>
                  <i className="fas fa-image" style={{ marginRight: 6 }}></i>Сменить обложку
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverChange} />
                </label>
                {coverPreview && <img src={coverPreview} style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', marginLeft: 12, verticalAlign: 'middle' }} alt="" />}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button className="btn" onClick={savePlaylist} disabled={saving} style={{ padding: '8px 20px' }}>
                  {saving ? 'Сохраняю...' : 'Сохранить'}
                </button>
                <button className="btn-secondary" onClick={() => { setEditMode(false); setCoverFile(null); setCoverPreview(null); }} style={{ padding: '8px 16px' }}>
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2>{playlist.name}</h2>
              <p className="playlist-desc">{playlist.description}</p>
              <div className="playlist-stats">
                Создан: {new Date(playlist.created_at).toLocaleDateString('ru-RU')} •
                {playlist.tracks?.length || 0} треков •
                {playlist.is_public ? 'Публичный' : 'Приватный'}
              </div>
              {isOwner && (
                <button className="btn-secondary" onClick={() => setEditMode(true)} style={{ marginTop: 14, padding: '8px 18px' }}>
                  <i className="fas fa-pen" style={{ marginRight: 6 }}></i>Редактировать
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="section">
        <h2>Треки</h2>
        {(!playlist.tracks || playlist.tracks.length === 0) ? (
          <p>В этом плейлисте пока нет треков</p>
        ) : (
          <div className="track-list">
            {playlist.tracks.map((track, index) => (
              <div key={track.id} className="track-item">
                <div className="track-info" onClick={() => handlePlayTrack(track)}>
                  <span className="track-number">{currentTrack?.id === track.id && storeIsPlaying ? <i className="fas fa-volume-up playing-indicator"></i> : index + 1}</span>
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
                  </div>
                </div>
                <div className="track-actions">
                  <button className="card-action-icon" onClick={e=>{e.stopPropagation();addToQueue(track);}} title="В очередь">
                    <i className={`fas fa-list-ol ${dynamicQueue.some(t=>t.id===track.id)?'in-queue':''}`}></i>
                  </button>
                  <LikeButton item={track} type="tracks" initialState={track.liked} />
                  <DownloadButton trackId={track.id} trackTitle={track.title} />
                  <AddToPlaylistButton trackId={track.id} trackTitle={track.title} />
                  {isOwner && (
                    <i 
                      className="fas fa-times" 
                      style={{ color: '#ff6b6b', cursor: 'pointer' }}
                      onClick={() => handleRemoveTrack(track.id)}
                      title="Убрать из плейлиста"
                    ></i>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}