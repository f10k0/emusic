import { useEffect, useRef } from 'react';
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
  const contentRef = useRef(null);

  useEffect(() => {
    // Apply cached theme instantly
    const cachedTheme = localStorage.getItem('emusic_theme') || 'dark';
    useSettingsStore.getState().applyTheme(cachedTheme);

    const token = localStorage.getItem('access_token');
    if (token) {
      useAuthStore.getState().fetchUser()
        .then(user => {
          if (user) {
            api.get('/users/me/settings')
              .then(r => {
                if (r.data?.theme) localStorage.setItem('emusic_theme', r.data.theme);
                useSettingsStore.getState().loadSettings(r.data);
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, []);

  // Page transition - fade content on route change
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const handleStart = () => {
      el.style.transition = 'opacity 0.15s ease';
      el.style.opacity = '0';
    };
    const handleDone = () => {
      el.style.opacity = '0';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition = 'opacity 0.2s ease';
          el.style.opacity = '1';
        });
      });
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleDone);
    router.events.on('routeChangeError', handleDone);
    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleDone);
      router.events.off('routeChangeError', handleDone);
    };
  }, [router]);

  // Stop player on clips page
  useEffect(() => {
    if (isClipsPage) {
      const { isPlaying, togglePlay } = usePlayerStore.getState();
      if (isPlaying) togglePlay();
    }
  }, [isClipsPage]);

  // Save queue to localStorage if setting enabled
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
      <div ref={contentRef} style={{ opacity: 1 }}>
        <Component {...pageProps} />
      </div>
      {!isClipsPage && <PlayerBar />}
    </ToastProvider>
  );
}

export default MyApp;
