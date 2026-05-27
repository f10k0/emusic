import { useEffect } from 'react';
import { useRouter } from 'next/router';
import '../styles/globals.css';
import useAuthStore from '../store/authStore';
import usePlayerStore from '../store/playerStore';
import useSettingsStore from '../store/settingsStore';
import PlayerBar from '../components/PlayerBar';
import { ToastProvider } from '../components/Toast';
import api from '../lib/api';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const isClipsPage = router.pathname === '/clips';

  useEffect(() => {
    // Apply cached theme instantly (before API responds) to avoid flash
    const cachedTheme = localStorage.getItem('emusic_theme') || 'dark';
    useSettingsStore.getState().applyTheme(cachedTheme);

    const token = localStorage.getItem('access_token');
    if (token) {
      useAuthStore.getState().fetchUser()
        .then(user => {
          if (user) {
            api.get('/users/me/settings')
              .then(r => {
                // Cache theme for next load
                if (r.data?.theme) localStorage.setItem('emusic_theme', r.data.theme);
                useSettingsStore.getState().loadSettings(r.data);
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, []);

  // Стоп плеера на странице клипов
  useEffect(() => {
    if (isClipsPage) {
      const { isPlaying, togglePlay } = usePlayerStore.getState();
      if (isPlaying) togglePlay();
    }
  }, [isClipsPage]);

  // Сохраняем очередь если включена настройка
  useEffect(() => {
    const unsub = usePlayerStore.subscribe((state) => {
      const { save_queue } = useSettingsStore.getState().settings;
      if (save_queue) {
        localStorage.setItem('player_queue', JSON.stringify({
          queue: state.queue,
          dynamicQueue: state.dynamicQueue,
        }));
      }
    });
    return () => unsub();
  }, []);

  return (
    <ToastProvider>
      <Component {...pageProps} />
      {!isClipsPage && <PlayerBar />}
    </ToastProvider>
  );
}

export default MyApp;
