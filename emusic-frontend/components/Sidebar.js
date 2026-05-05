import Link from 'next/link';
import { useRouter } from 'next/router';
import useAuthStore from '../store/authStore';

export default function Sidebar() {
  const router = useRouter();
  const { user } = useAuthStore();

  const isActive = (path) => router.pathname === path;
  const isFavoritesTabActive = (tab) =>
    router.pathname === '/profile/favorites' && router.query.tab === tab;

  return (
    <div className="sidebar">
      <div className="logo">
        <i className="fas fa-headphones-alt"></i>
        <span>eMusic</span>
      </div>

      <ul className="nav-links">
        <li>
          <Link href="/" className={isActive('/') ? 'active' : ''}>
            <i className="fas fa-home"></i> Главная
          </Link>
        </li>
        <li>
          <Link href="/search" className={isActive('/search') ? 'active' : ''}>
            <i className="fas fa-search"></i> Поиск
          </Link>
        </li>
        <li>
          <Link href="/events" className={isActive('/events') ? 'active' : ''}>
            <i className="fas fa-calendar-alt"></i> Мероприятия
          </Link>
        </li>
      </ul>

      <div className="sidebar-divider"></div>

      <div className="sidebar-section">
        <h3>Библиотека</h3>
        <ul>
          <li>
            <Link href="/profile/favorites?tab=tracks" className={isFavoritesTabActive('tracks') ? 'active' : ''}>
              <i className="fas fa-heart"></i> Любимые треки
            </Link>
          </li>
          <li>
            <Link href="/profile/favorites?tab=albums" className={isFavoritesTabActive('albums') ? 'active' : ''}>
              <i className="fas fa-compact-disc"></i> Любимые альбомы
            </Link>
          </li>
          <li>
            <Link href="/profile/favorites?tab=artists" className={isFavoritesTabActive('artists') ? 'active' : ''}>
              <i className="fas fa-microphone-alt"></i> Любимые артисты
            </Link>
          </li>
          <li>
            <Link href="/playlists" className={isActive('/playlists') || router.pathname.startsWith('/playlists/') ? 'active' : ''}>
              <i className="fas fa-list"></i> Мои плейлисты
            </Link>
          </li>
          <li>
            <Link href="/genres" className={isActive('/genres') ? 'active' : ''}>
              <i className="fas fa-tags"></i> Жанры
            </Link>
          </li>
          <li>
            <Link href="/chart" className={isActive('/chart') ? 'active' : ''}>
              <i className="fas fa-chart-line"></i> Чарт
            </Link>
          </li>
        </ul>
      </div>



      {user && user.role === 'user' && (
        <>
          <div className="sidebar-divider"></div>
          <div className="sidebar-section">
            <h3>Стать артистом</h3>
            <ul>
              <li>
                <Link href="/artist/create" className={isActive('/artist/create') ? 'active' : ''}>
                  <i className="fas fa-star"></i> Создать профиль артиста
                </Link>
              </li>
            </ul>
          </div>
        </>
      )}

      {user && user.role === 'artist' && (
        <>
          <div className="sidebar-divider"></div>
          <div className="sidebar-section">
            <h3>Для артистов</h3>
            <ul>
              <li>
                <Link href="/artist/upload" className={isActive('/artist/upload') ? 'active' : ''}>
                  <i className="fas fa-upload"></i> Загрузить трек
                </Link>
              </li>
              <li>
                <Link href="/artist/upload-video" className={isActive('/artist/upload-video') ? 'active' : ''}>
                  <i className="fas fa-video"></i> Загрузить клип
                </Link>
              </li>
              <li>
                <Link href="/artist/my-clips" className={isActive('/artist/my-clips') ? 'active' : ''}>
                  <i className="fas fa-film"></i> Мои клипы
                </Link>
              </li>
              <li>
                <Link href="/artist/my-tracks" className={isActive('/artist/my-tracks') ? 'active' : ''}>
                  <i className="fas fa-music"></i> Мои треки
                </Link>
              </li>
              <li>
                <Link href="/artist/albums" className={isActive('/artist/albums') ? 'active' : ''}>
                  <i className="fas fa-compact-disc"></i> Мои альбомы
                </Link>
              </li>
              <li>
                <Link href="/artist/events" className={isActive('/artist/events') ? 'active' : ''}>
                  <i className="fas fa-calendar-plus"></i> Мои мероприятия
                </Link>
              </li>
              <li>
                <Link href="/artist/settings" className={isActive('/artist/settings') ? 'active' : ''}>
                  <i className="fas fa-cog"></i> Настройки профиля
                </Link>
              </li>
              <li>
                <Link href="/artist/submissions" className={isActive('/artist/submissions') ? 'active' : ''}>
                  <i className="fas fa-clock"></i> Мои заявки
                </Link>
              </li>
            </ul>
          </div>
        </>
      )}

      {user && user.role === 'admin' && (
        <>
          <div className="sidebar-divider"></div>
          <div className="sidebar-section">
            <h3>Админ</h3>
            <ul>
              <li>
                <Link href="/admin/submissions" className={isActive('/admin/submissions') ? 'active' : ''}>
                  <i className="fas fa-tasks"></i> Модерация
                </Link>
              </li>
              <li>
                <Link href="/admin/tracks" className={isActive('/admin/tracks') ? 'active' : ''}>
                  <i className="fas fa-music"></i> Управление треками
                </Link>
              </li>
              <li>
                <Link href="/admin/console" className={isActive('/admin/console') ? 'active' : ''}>
                  <i className="fas fa-chart-line"></i> Админ-консоль
                </Link>
              </li>
              <li>
                <Link href="/admin/videos" className={isActive('/admin/videos') ? 'active' : ''}>
                  <i className="fas fa-film"></i> Модерация видео
                </Link>
              </li>
              <li>
                <Link href="/admin/news" className={isActive('/admin/news') ? 'active' : ''}>
                  <i className="fas fa-newspaper"></i> Новости
                </Link>
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
