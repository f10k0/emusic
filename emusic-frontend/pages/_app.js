import { useEffect } from 'react';
import { useRouter } from 'next/router';
import '../styles/globals.css';
import useAuthStore from '../store/authStore';
import usePlayerStore from '../store/playerStore';
import useSettingsStore from '../store/settingsStore';
import PlayerBar from '../components/PlayerBar';
import { ToastProvider } from '../components/Toast';
import api from '../lib/api';

// Apply a theme value to <html> data-theme attribute
function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme || 'dark');
}

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const isClipsPage = router.pathname === '/clips';

  useEffect(() => {
    // 1. Apply cached theme immediately (no flash)
    const cachedTheme = localStorage.getItem('emusic_equipped_theme')
      || localStorage.getItem('emusic_theme')
      || 'dark';
    applyTheme(cachedTheme);

    const token = localStorage.getItem('access_token');
    if (!token) return;

    useAuthStore.getState().fetchUser()
      .then(user => {
        if (!user) return;

        // Load user settings (light/dark preference)
        api.get('/users/me/settings')
          .then(r => {
            useSettingsStore.getState().loadSettings(r.data);
            // Only apply settings theme if no shop theme is equipped
            const equippedTheme = localStorage.getItem('emusic_equipped_theme');
            if (!equippedTheme && r.data?.theme) {
              localStorage.setItem('emusic_theme', r.data.theme);
              applyTheme(r.data.theme);
            }
          })
          .catch(() => {});

        // Load equipped items — shop theme overrides user setting
        api.get('/gamification/equipped')
          .then(r => {
            const equipped = r.data || {};
            if (equipped.theme) {
              localStorage.setItem('emusic_equipped_theme', equipped.theme);
              applyTheme(equipped.theme);
            } else {
              // No shop theme equipped — remove cached shop theme
              localStorage.removeItem('emusic_equipped_theme');
              const userTheme = localStorage.getItem('emusic_theme') || 'dark';
              applyTheme(userTheme);
            }
            // Store globally for other components
            if (typeof window !== 'undefined') window.__equippedItems = equipped;
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, []);

  // Re-apply theme when route changes (in case it got reset)
  useEffect(() => {
    const equippedTheme = localStorage.getItem('emusic_equipped_theme');
    const userTheme = localStorage.getItem('emusic_theme') || 'dark';
    applyTheme(equippedTheme || userTheme);
  }, [router.pathname]);

  useEffect(() => {
    if (isClipsPage) {
      const { isPlaying, togglePlay } = usePlayerStore.getState();
      if (isPlaying) togglePlay();
    }
  }, [isClipsPage]);

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
