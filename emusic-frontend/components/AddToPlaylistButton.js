import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import api from '../lib/api';

export default function AddToPlaylistButton({ trackId }) {
  const [playlists, setPlaylists] = useState([]);
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, right: 'auto', bottom: 'auto' });
  const [dropdownDirection, setDropdownDirection] = useState('bottom'); // 'bottom' or 'top'
  const btnRef = useRef(null);
  const dropdownRef = useRef(null);
  const router = useRouter();

  // Загружаем плейлисты при открытии
  useEffect(() => {
    if (show) {
      fetchPlaylists();
    }
  }, [show]);

  // Рассчитываем позицию при открытии
  useEffect(() => {
    if (show && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const dropdownWidth = 280; // ширина меню
      const dropdownHeight = 300; // примерная высота (можно будет позже уточнить)
      const spaceRight = window.innerWidth - rect.right;
      const spaceBottom = window.innerHeight - rect.bottom;
      const spaceTop = rect.top;

      let left = rect.right - dropdownWidth; // по умолчанию выравниваем по правому краю кнопки
      if (left < 10) left = 10; // не прижимаем к левому краю

      // Если справа мало места, смещаем влево
      if (spaceRight < dropdownWidth) {
        left = rect.left;
        if (left + dropdownWidth > window.innerWidth - 10) {
          left = window.innerWidth - dropdownWidth - 10;
        }
      }

      // Определяем, где показывать: снизу или сверху
      let top;
      let direction = 'bottom';
      if (spaceBottom < dropdownHeight && spaceTop > dropdownHeight) {
        // Показываем сверху
        top = rect.top - dropdownHeight - 10;
        direction = 'top';
      } else {
        // Показываем снизу
        top = rect.bottom + 10;
        direction = 'bottom';
      }

      setPosition({ top, left, right: 'auto', bottom: 'auto' });
      setDropdownDirection(direction);
    }
  }, [show]);

  // Закрытие при клике вне
  useEffect(() => {
    const handler = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !btnRef.current?.contains(e.target)
      ) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchPlaylists = async () => {
    try {
      const res = await api.get('/playlists/my');
      setPlaylists(res.data || []);
    } catch (err) {
      console.error('Ошибка загрузки плейлистов:', err);
    }
  };

  const addToPlaylist = async (playlistId) => {
    try {
      await api.post(`/playlists/${playlistId}/tracks/${trackId}`);
      alert('Трек добавлен в плейлист');
      setShow(false);
    } catch (err) {
      console.error('Ошибка добавления:', err);
      alert('Не удалось добавить трек');
    }
  };

  const goToCreatePlaylist = () => {
    setShow(false);
    router.push('/playlists?create=true');
  };

  return (
    <>
      <i
        ref={btnRef}
        className="fas fa-plus-circle"
        onClick={(e) => { e.stopPropagation(); setShow(!show); }}
        style={{
          cursor: 'pointer',
          color: 'var(--accent)',
          fontSize: '1.2rem',
          transition: 'transform 0.2s',
          transform: show ? 'rotate(45deg)' : 'none',
        }}
        title="Добавить в плейлист"
      />
      {show && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            width: '280px',
            maxHeight: '300px',
            overflowY: 'auto',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow)',
            zIndex: 2000,
            ...(dropdownDirection === 'top' ? { marginTop: '-10px' } : { marginTop: '0' }),
          }}
        >
          {/* Маленькая стрелочка-указатель (опционально) */}
          <div
            style={{
              position: 'absolute',
              [dropdownDirection === 'bottom' ? 'top' : 'bottom']: '-6px',
              left: '20px',
              width: '12px',
              height: '12px',
              backgroundColor: 'var(--bg-secondary)',
              borderLeft: '1px solid var(--border)',
              borderTop: '1px solid var(--border)',
              transform: dropdownDirection === 'bottom' ? 'rotate(45deg)' : 'rotate(225deg)',
              zIndex: -1,
            }}
          />
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <strong>Добавить в плейлист</strong>
          </div>
          {playlists.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ marginBottom: '10px' }}>У вас нет плейлистов</p>
              <button className="btn" onClick={goToCreatePlaylist} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                Создать плейлист
              </button>
            </div>
          ) : (
            <>
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => addToPlaylist(playlist.id)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <img
                    src={playlist.cover_image ? `${process.env.NEXT_PUBLIC_API_URL}/${playlist.cover_image}` : '/default-playlist.png'}
                    alt={playlist.name}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                    }}
                    onError={(e) => (e.target.src = '/default-playlist.png')}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600' }}>{playlist.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {playlist.tracks?.length || 0} треков • {playlist.is_public ? 'Публичный' : 'Приватный'}
                    </div>
                  </div>
                </button>
              ))}
              <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                <button className="btn-secondary" onClick={goToCreatePlaylist} style={{ width: '100%', padding: '8px' }}>
                  + Создать новый плейлист
                </button>
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}