import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/router';
import useAuthStore from '../store/authStore';

export default function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !triggerRef.current?.contains(event.target)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // При открытии вычисляем позицию
  useEffect(() => {
    if (dropdownOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 5,
        right: window.innerWidth - rect.right,
      });
    }
  }, [dropdownOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    router.push('/');
  };

  return (
    <div className="content-header">
      <div className="header-left">
        <h1>
          {router.pathname === '/' && 'Главная'}
          {router.pathname === '/search' && 'Поиск'}
          {router.pathname.startsWith('/artist/') && router.pathname !== '/artist/create' && router.pathname !== '/artist/upload' && router.pathname !== '/artist/my-tracks' && router.pathname !== '/artist/settings' && router.pathname !== '/artist/submissions' && router.pathname !== '/artist/albums' && 'Артист'}
          {router.pathname === '/artist/create' && 'Стать артистом'}
          {router.pathname === '/artist/upload' && 'Загрузить трек'}
          {router.pathname === '/artist/my-tracks' && 'Мои треки'}
          {router.pathname === '/artist/albums' && 'Мои альбомы'}
          {router.pathname === '/artist/settings' && 'Настройки профиля'}
          {router.pathname === '/artist/submissions' && 'Мои заявки'}
          {router.pathname.startsWith('/album/') && 'Альбом'}
          {router.pathname === '/profile' && 'Профиль'}
          {router.pathname === '/profile/favorites' && 'Избранное'}
          {router.pathname === '/playlists' && 'Мои плейлисты'}
          {router.pathname.startsWith('/playlists/') && router.pathname !== '/playlists' && 'Плейлист'}
          {router.pathname === '/admin/submissions' && 'Модерация'}
          {router.pathname === '/admin/tracks' && 'Управление треками'}
          {router.pathname === '/admin/console' && 'Админ-консоль'}
        </h1>
        <div className="header-date">
          {new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="header-right">
        <form className="search-bar" onSubmit={handleSearch}>
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Поиск треков, альбомов, артистов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        {!user ? (
          <div className="auth-buttons">
            <Link href="/login" className="btn-login">Вход</Link>
            <Link href="/register" className="btn-register">Регистрация</Link>
          </div>
        ) : (
          <div className="user-menu" ref={triggerRef}>
            <div className="user-menu-trigger" onClick={() => setDropdownOpen(!dropdownOpen)}>
              {user.avatar ? (
                <img 
                  src={`${process.env.NEXT_PUBLIC_API_URL}/${user.avatar}`} 
                  alt={user.username}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline-block'; }}
                />
              ) : null}
              <i className="fas fa-user-circle" style={{ fontSize: '32px', display: user.avatar ? 'none' : 'inline-block' }}></i>
              <span>{user.username}</span>
              <i className={`fas fa-chevron-${dropdownOpen ? 'up' : 'down'}`} style={{ fontSize: '0.8rem', marginLeft: '5px' }}></i>
            </div>
          </div>
        )}
      </div>

      {dropdownOpen && createPortal(
        <div
          ref={dropdownRef}
          className="dropdown"
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            right: dropdownPosition.right,
            zIndex: 10000,
          }}
        >
          <Link href="/profile" onClick={() => setDropdownOpen(false)}>
            <i className="fas fa-user"></i> Профиль
          </Link>
          <Link href="/profile/favorites" onClick={() => setDropdownOpen(false)}>
            <i className="fas fa-heart"></i> Избранное
          </Link>
          <Link href="/playlists" onClick={() => setDropdownOpen(false)}>
            <i className="fas fa-list"></i> Мои плейлисты
          </Link>
          
          {user.role === 'user' && (
            <Link href="/artist/create" onClick={() => setDropdownOpen(false)}>
              <i className="fas fa-star"></i> Стать артистом
            </Link>
          )}
          
          {user.role === 'artist' && (
            <>
              <Link href="/artist/upload" onClick={() => setDropdownOpen(false)}>
                <i className="fas fa-upload"></i> Загрузить трек
              </Link>
              <Link href="/artist/my-tracks" onClick={() => setDropdownOpen(false)}>
                <i className="fas fa-music"></i> Мои треки
              </Link>
              <Link href="/artist/albums" onClick={() => setDropdownOpen(false)}>
                <i className="fas fa-compact-disc"></i> Мои альбомы
              </Link>
              <Link href="/artist/settings" onClick={() => setDropdownOpen(false)}>
                <i className="fas fa-cog"></i> Настройки профиля
              </Link>
              <Link href="/artist/submissions" onClick={() => setDropdownOpen(false)}>
                <i className="fas fa-clock"></i> Мои заявки
              </Link>
            </>
          )}
          
          {user.role === 'admin' && (
            <>
              <Link href="/admin/submissions" onClick={() => setDropdownOpen(false)}>
                <i className="fas fa-tasks"></i> Модерация
              </Link>
              <Link href="/admin/tracks" onClick={() => setDropdownOpen(false)}>
                <i className="fas fa-music"></i> Управление треками
              </Link>
              <Link href="/admin/console" onClick={() => setDropdownOpen(false)}>
                <i className="fas fa-chart-line"></i> Админ-консоль
              </Link>
            </>
          )}
          
          <button onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Выйти
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}