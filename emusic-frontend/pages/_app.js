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
    const token = localStorage.getItem('access_token');
    if (token) {
      useAuthStore.getState().fetchUser()
        .then(user => {
          if (user) {
            api.get('/users/me/settings')
              .then(r => useSettingsStore.getState().loadSettings(r.data))
              .catch(() => useSettingsStore.getState().applyTheme('dark'));
          }
        })
        .catch(() => useSettingsStore.getState().applyTheme('dark'));
    } else {
      useSettingsStore.getState().applyTheme('dark');
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
