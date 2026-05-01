import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import useAuthStore from '../../store/authStore';
import api from '../../lib/api';
import ProtectedRoute from '../../components/ProtectedRoute';
import Link from 'next/link';

export default function Profile() {
  const router = useRouter();
  const { userId } = router.query; // для просмотра чужого профиля (если нужно)
  const { user: currentUser, fetchUser } = useAuthStore();
  const [profileUser, setProfileUser] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Определяем, чей профиль смотрим
  const isOwnProfile = !userId || (currentUser && currentUser.id === parseInt(userId));

  useEffect(() => {
    if (!currentUser && !userId) {
      fetchUser();
    } else {
      loadProfileData();
    }
  }, [currentUser, userId]);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      let userData;
      if (isOwnProfile) {
        userData = currentUser;
        setForm({ username: userData.username, email: userData.email, password: '' });
      } else {
        // Загружаем данные пользователя по userId (нужен эндпоинт GET /users/{id})
        // Для простоты предположим, что такого эндпоинта нет, и используем текущего
        // В реальном проекте нужно добавить соответствующий эндпоинт на бэкенде
        // Пока заглушка
        userData = null;
      }
      setProfileUser(userData);

      // Загружаем публичные плейлисты
      const playlistsRes = await api.get(`/playlists/user/${isOwnProfile ? currentUser.id : userId}`);
      setPlaylists(playlistsRes.data || []);
    } catch (err) {
      console.error('Ошибка загрузки профиля:', err);
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
    } catch (err) {
      console.error(err);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingAvatar(true);
    try {
      await api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchUser();
    } catch (err) {
      console.error(err);
      alert('Ошибка загрузки аватарки');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) return <Layout>Загрузка...</Layout>;

  const user = profileUser || currentUser;
  if (!user) return <Layout>Пользователь не найден</Layout>;

  return (
    <ProtectedRoute>
      <Layout>
        <div className="profile-container">
          {/* Шапка профиля */}
          <div className="profile-header">
            <div className="profile-avatar">
              <img
                src={user.avatar ? `${process.env.NEXT_PUBLIC_API_URL}/${user.avatar}` : '/default-avatar.png'}
                alt="avatar"
              />
              {isOwnProfile && (
                <>
                  <div className="avatar-overlay" onClick={() => document.getElementById('avatar-input').click()}>
                    {uploadingAvatar ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <>
                        <i className="fas fa-camera"></i>
                        <span>Изменить</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    id="avatar-input"
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                </>
              )}
            </div>
            <div className="profile-info">
              <h2 className="profile-username">{user.username}</h2>
              <p>{user.email}</p>
              <span id="role-badge">{user.role}</span>
              {isOwnProfile && (
                <button className="btn-secondary" onClick={() => setEditMode(!editMode)}>
                  Редактировать
                </button>
              )}
            </div>
          </div>

          {/* Секция публичных плейлистов */}
          {playlists.length > 0 && (
            <div className="section">
              <h2>Публичные плейлисты</h2>
              <div className="card-grid">
                {playlists.map(playlist => (
                  <Link href={`/playlists/${playlist.id}`} key={playlist.id} className="card">
                    <div className="card-image">
                      <img
                        src={playlist.cover_image ? `${process.env.NEXT_PUBLIC_API_URL}/${playlist.cover_image}` : '/default-playlist.png'}
                        alt={playlist.name}
                        onError={(e) => { e.target.src = '/default-playlist.png'; }}
                      />
                    </div>
                    <div className="card-title">{playlist.name}</div>
                    <div className="card-sub">
                      {playlist.tracks?.length || 0} треков
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Форма редактирования (только для своего профиля) */}
          {isOwnProfile && editMode && (
            <div className="edit-profile-form">
              <h3>Редактировать профиль</h3>
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label>Имя пользователя</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Новый пароль (оставьте пустым, если не хотите менять)</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn">Сохранить</button>
                <button type="button" className="btn-secondary" onClick={() => setEditMode(false)}>Отмена</button>
              </form>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}