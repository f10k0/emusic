import { useEffect, useState } from 'react';
import { useToast } from '../../components/Toast';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import useAuthStore from '../../store/authStore';
import useRequireAuth from '../../hooks/useRequireAuth';
import api from '../../lib/api';
import ProtectedRoute from '../../components/ProtectedRoute';
import Link from 'next/link';

// ── Visual effects for each item value ──────────────────────────
const BG_STYLES = {
  'bg-stars': {
    background: 'radial-gradient(ellipse at 20% 50%, #0d0221 0%, #000510 60%)',
    extra: 'stars', // renders star particles
  },
  'bg-gradient': {
    background: 'linear-gradient(135deg, #1a0533 0%, #2d0a4e 40%, #0d1a40 100%)',
  },
  'bg-neon-waves': {
    background: 'linear-gradient(180deg, #0a0015 0%, #1a003a 50%, #0d1a40 100%)',
    extra: 'waves',
  },
  // legacy values (from old migration)
  'bg-galaxy': {
    background: 'radial-gradient(ellipse at 20% 50%, #1a0533 0%, #0d0221 40%, #000510 100%)',
    extra: 'stars',
  },
  'bg-neoncity': {
    background: 'linear-gradient(180deg, #0a0015 0%, #1a0030 40%, #2d0050 70%, #0d1a40 100%)',
  },
  'bg-forest': {
    background: 'linear-gradient(160deg, #0a1f0a 0%, #1a3a1a 40%, #0d2b0d 100%)',
  },
  'bg-ocean': {
    background: 'linear-gradient(160deg, #001a33 0%, #003366 40%, #004080 60%, #002244 100%)',
  },
};

const FRAME_SHADOWS = {
  'frame-gold':   '0 0 0 4px #ffb300, 0 0 22px #ffb30077',
  'frame-neon':   '0 0 0 4px #00e5ff, 0 0 22px #00e5ff77',
  'frame-silver': '0 0 0 4px #bdbdbd, 0 0 14px #bdbdbd55',
  'frame-fire':   '0 0 0 4px #ff5722, 0 0 26px #ff572299',
};

const NICK_STYLES = {
  'nick-gold':    { color: '#ffb300', WebkitTextFillColor: '#ffb300' },
  'nick-neon':    { color: '#00e5ff', WebkitTextFillColor: '#00e5ff' },
  'nick-rainbow': null, // handled via CSS class
};

const BADGE_LABELS = {
  'badge-meloman': 'Меломан',
  'badge-legend':  'Легенда',
  'badge-audiophile': 'Меломан',
  'badge-explorer': 'Первооткрыватель',
};

export default function Profile() {
  const toast = useToast();
  const router = useRouter();
  const { userId } = router.query;
  const { user: currentUser, fetchUser } = useAuthStore();

  const [profileUser, setProfileUser]   = useState(null);
  const [playlists, setPlaylists]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [editMode, setEditMode]         = useState(false);
  const [form, setForm]                 = useState({ username: '', email: '', password: '' });
  const [uploadingAvatar, setUploading] = useState(false);
  const [artistProfile, setArtist]      = useState(null);
  const [progress, setProgress]         = useState(null);
  // Use the equipped map directly from the API (not rebuilt from inventory)
  const [equipped, setEquipped]         = useState({});

  const isOwnProfile = !userId || (currentUser && currentUser.id === parseInt(userId));

  const avatarFrame = equipped['avatar_frame']   || '';
  const nickColor   = equipped['nickname_color'] || '';
  const bgValue     = equipped['bg']             || '';
  const themeValue  = equipped['theme']          || '';
  const badgeValue  = equipped['badge']          || '';

  // Apply shop theme globally and persist across navigation
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (themeValue) {
      document.documentElement.setAttribute('data-theme', themeValue);
      localStorage.setItem('emusic_equipped_theme', themeValue);
    } else {
      localStorage.removeItem('emusic_equipped_theme');
      const userTheme = localStorage.getItem('emusic_theme') || 'dark';
      document.documentElement.setAttribute('data-theme', userTheme);
    }
  }, [themeValue]);

  useEffect(() => {
    if (!currentUser && !userId) fetchUser();
    else loadProfileData();
  }, [currentUser?.id, userId]);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      const user = isOwnProfile ? currentUser : null;
      setProfileUser(user);
      if (user) setForm({ username: user.username, email: user.email, password: '' });

      const targetId = isOwnProfile ? currentUser?.id : userId;

      // Always load equipped from the dedicated endpoint — returns {item_type: value}
      const [playlistsRes, equippedRes] = await Promise.all([
        api.get(`/playlists/user/${targetId}`).catch(() => ({ data: [] })),
        api.get(isOwnProfile
          ? '/gamification/equipped'
          : `/gamification/user/${targetId}/equipped`
        ).catch(() => ({ data: {} })),
      ]);
      setPlaylists(playlistsRes.data || []);
      setEquipped(equippedRes.data || {});

      if (isOwnProfile) {
        const prog = await api.get('/gamification/progress').then(r => r.data).catch(() => null);
        setProgress(prog);
        try {
          const ar = await api.get('/artists/me');
          setArtist(ar.data);
        } catch {}
      }
    } catch (err) {
      console.error('Profile load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.put('/users/me', form);
      await fetchUser();
      setEditMode(false);
      toast('Профиль обновлён', 'success');
    } catch { toast('Ошибка сохранения', 'error'); }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      await api.post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchUser();
      toast('Аватар обновлён', 'success');
    } catch { toast('Ошибка загрузки', 'error'); }
    finally { setUploading(false); }
  };

  if (loading) return <Layout><div className="page-loading">Загрузка...</div></Layout>;
  const user = profileUser || currentUser;
  if (!user) return <Layout>Пользователь не найден</Layout>;

  // ── Build styles from equipped values ──────────────────────────
  const bgDef = bgValue ? BG_STYLES[bgValue] : null;

  const headerStyle = {
    background: bgDef ? bgDef.background : 'var(--bg-secondary)',
    transition: 'background 0.4s ease',
  };

  const avatarStyle = FRAME_SHADOWS[avatarFrame]
    ? { boxShadow: FRAME_SHADOWS[avatarFrame] }
    : {};

  const isRainbow = nickColor === 'nick-rainbow';
  const nickStyle = !isRainbow && NICK_STYLES[nickColor]
    ? NICK_STYLES[nickColor]
    : {};

  const hasEquipped = Object.keys(equipped).length > 0;

  return (
    <ProtectedRoute>
      <Layout>
        <div className="profile-container">

          <div className="profile-header" style={headerStyle}>

            {/* Star particles for starry bg */}
            {bgDef?.extra === 'stars' && (
              <div className="bg-stars-layer" aria-hidden>
                {Array.from({ length: 50 }).map((_, i) => (
                  <span key={i} style={{
                    position: 'absolute',
                    left: `${(i * 17 + 3) % 100}%`,
                    top:  `${(i * 23 + 7) % 100}%`,
                    width:  `${(i % 3) + 1}px`,
                    height: `${(i % 3) + 1}px`,
                    borderRadius: '50%',
                    background: i % 5 === 0 ? '#b388ff' : 'white',
                    opacity: 0.3 + (i % 7) * 0.1,
                    animation: `twinkle ${1.5 + (i % 4) * 0.5}s ease-in-out ${(i % 10) * 0.3}s infinite alternate`,
                  }} />
                ))}
              </div>
            )}

            {/* Neon wave lines */}
            {bgDef?.extra === 'waves' && (
              <div className="bg-waves-layer" aria-hidden>
                {[0,1,2].map(i => (
                  <div key={i} className="neon-wave" style={{ animationDelay: `${i * 0.4}s`, opacity: 0.15 + i * 0.05 }} />
                ))}
              </div>
            )}

            {/* Avatar */}
            <div style={{ flexShrink: 0, position: 'relative', zIndex: 1 }}>
              <div style={{ position: 'relative', width: 100, height: 100 }}>
                <img
                  src={user.avatar ? `${process.env.NEXT_PUBLIC_API_URL}/${user.avatar}` : '/default-avatar.png'}
                  alt="avatar"
                  style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', display: 'block', transition: 'box-shadow 0.3s', ...avatarStyle }}
                />
                {isOwnProfile && (
                  <>
                    <div className="avatar-overlay" onClick={() => document.getElementById('avatar-file').click()}>
                      {uploadingAvatar
                        ? <i className="fas fa-spinner fa-spin" />
                        : <><i className="fas fa-camera" /><span style={{ fontSize: '0.7rem', marginTop: 2 }}>Изменить</span></>}
                    </div>
                    <input type="file" id="avatar-file" style={{ display: 'none' }} accept="image/*" onChange={handleAvatarUpload} />
                  </>
                )}
              </div>
            </div>

            {/* Info */}
            <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
              {isRainbow
                ? <h2 className="profile-username nick-rainbow">{user.username}</h2>
                : <h2 className="profile-username" style={nickStyle}>{user.username}</h2>
              }

              {badgeValue && (
                <div style={{ fontSize: '0.82rem', color: '#ffb300', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <i className="fas fa-certificate" />
                  {BADGE_LABELS[badgeValue] || badgeValue}
                </div>
              )}

              <p style={{ margin: '2px 0 6px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{user.email}</p>
              <span id="role-badge">{user.role}</span>

              {progress && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <span style={{ background: 'var(--accent)', color: 'white', fontWeight: 700, padding: '3px 10px', borderRadius: 14, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    Ур. {progress.level}
                  </span>
                  <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', minWidth: 80 }}>
                    <div style={{ height: '100%', width: `${progress.level_progress_pct}%`, background: 'var(--accent)', borderRadius: 4, transition: 'width 0.4s' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{progress.level_progress_pct}%</span>
                </div>
              )}

              {isOwnProfile && progress && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-coins" style={{ color: '#ffb300' }} /> {progress.ecoins} Ecoins
                  <span style={{ opacity: 0.4 }}>·</span>
                  <i className="fas fa-headphones" /> {progress.total_listen_hours} ч.
                </div>
              )}

              {isOwnProfile && hasEquipped && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {avatarFrame && <span className="eq-chip"><i className="fas fa-id-card" /> Рамка надета</span>}
                  {nickColor   && <span className="eq-chip"><i className="fas fa-font" /> Цвет ника</span>}
                  {bgValue     && <span className="eq-chip"><i className="fas fa-image" /> Фон надет</span>}
                  {themeValue  && <span className="eq-chip"><i className="fas fa-palette" /> Тема</span>}
                  {badgeValue  && <span className="eq-chip"><i className="fas fa-certificate" /> Значок</span>}
                </div>
              )}

              {user.role === 'artist' && artistProfile && (
                <Link href={`/artist/${artistProfile.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, color: 'var(--accent)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>
                  <i className="fas fa-microphone-alt" /> Открыть профиль артиста
                </Link>
              )}

              {isOwnProfile && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <button className="btn-secondary" onClick={() => setEditMode(!editMode)}>
                    <i className="fas fa-edit" style={{ marginRight: 5 }} />Редактировать
                  </button>
                  <Link href="/profile/quests" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-scroll" />Квесты и магазин
                  </Link>
                  <Link href="/profile/settings" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-cog" />Настройки
                  </Link>
                  <Link href="/profile/stats" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-chart-bar" />Статистика
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Edit form */}
          {isOwnProfile && editMode && (
            <div className="edit-card">
              <h3><i className="fas fa-edit" style={{ marginRight: 8, color: 'var(--accent)' }} />Редактировать профиль</h3>
              <form onSubmit={handleSave}>
                {[
                  { label: 'Имя пользователя', field: 'username', type: 'text' },
                  { label: 'Email',             field: 'email',    type: 'email' },
                  { label: 'Новый пароль (оставьте пустым чтобы не менять)', field: 'password', type: 'password' },
                ].map(({ label, field, type }) => (
                  <div key={field} style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</label>
                    <input type={type} value={form[field]}
                      onChange={e => setForm({ ...form, [field]: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.9rem' }} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" className="btn">Сохранить</button>
                  <button type="button" className="btn-secondary" onClick={() => setEditMode(false)}>Отмена</button>
                </div>
              </form>
            </div>
          )}

          {/* Playlists */}
          {playlists.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h2><i className="fas fa-list" style={{ marginRight: 8, color: 'var(--accent)' }} />Публичные плейлисты</h2>
              <div className="card-grid">
                {playlists.map(pl => (
                  <Link href={`/playlists/${pl.id}`} key={pl.id} className="card">
                    <div className="card-image">
                      <img src={pl.cover_image ? `${process.env.NEXT_PUBLIC_API_URL}/${pl.cover_image}` : '/default-playlist.png'}
                        alt={pl.name} onError={e => { e.target.src = '/default-playlist.png'; }} />
                    </div>
                    <div className="card-title">{pl.name}</div>
                    <div className="card-sub">{pl.tracks?.length || 0} треков</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <style jsx>{`
          .profile-container { max-width: 900px; margin: 0 auto; padding: 24px 16px; }

          /* No background here — it comes from inline style */
          .profile-header {
            display: flex; gap: 24px; align-items: flex-start;
            border: 1px solid var(--border); border-radius: 16px;
            padding: 24px; margin-bottom: 24px;
            position: relative; overflow: hidden;
          }

          :global(.profile-username) {
            margin: 0 0 4px; font-size: 1.5rem; display: inline-block;
            -webkit-text-fill-color: unset;
          }
          :global(.profile-username.nick-rainbow) {
            background: linear-gradient(90deg,#f00,#ff7700,#ffff00,#0f0,#0ff,#00f,#f0f,#f00) !important;
            background-size: 200% auto !important;
            -webkit-background-clip: text !important;
            -webkit-text-fill-color: transparent !important;
            background-clip: text !important;
            animation: rainbow-move 3s linear infinite;
          }
          @keyframes rainbow-move { to { background-position: 200% center; } }

          /* Star / wave layers */
          .bg-stars-layer { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
          .bg-waves-layer { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
          .neon-wave {
            position: absolute; width: 200%; height: 2px;
            background: linear-gradient(90deg, transparent, #00e5ff, transparent);
            animation: wave-move 4s ease-in-out infinite alternate;
          }
          .neon-wave:nth-child(1) { top: 30%; }
          .neon-wave:nth-child(2) { top: 55%; animation-direction: alternate-reverse; }
          .neon-wave:nth-child(3) { top: 80%; }
          @keyframes wave-move { from { transform: translateX(-25%); } to { transform: translateX(0%); } }
          @keyframes twinkle   { from { opacity: 0.1; } to { opacity: 0.9; } }

          .avatar-overlay {
            position: absolute; inset: 0; border-radius: 50%;
            background: rgba(0,0,0,0.6); display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 3px;
            opacity: 0; transition: opacity 0.2s; cursor: pointer; color: white;
          }
          div:hover > div > .avatar-overlay { opacity: 1; }

          .eq-chip {
            font-size: 0.72rem; padding: 2px 8px; border-radius: 10px;
            background: rgba(136,51,255,0.15); color: var(--accent);
            border: 1px solid rgba(136,51,255,0.3);
            display: inline-flex; align-items: center; gap: 4px;
          }

          .edit-card {
            background: var(--bg-secondary); border: 1px solid var(--border);
            border-radius: 12px; padding: 20px; margin-bottom: 24px;
          }

          .btn-secondary {
            padding: 7px 14px; border-radius: 20px; background: var(--bg);
            color: var(--text); border: 1px solid var(--border); cursor: pointer;
            font-size: 0.84rem; transition: all 0.15s;
            display: inline-flex; align-items: center; gap: 5px;
          }
          .btn-secondary:hover { border-color: var(--accent); color: var(--accent); }
        `}</style>
      </Layout>
    </ProtectedRoute>
  );
}
