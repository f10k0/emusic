import { useEffect } from 'react';
import { useRouter } from 'next/router';
import '../styles/globals.css';
import useAuthStore from '../store/authStore';
import usePlayerStore from '../store/playerStore';
import PlayerBar from '../components/PlayerBar';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const isClipsPage = router.pathname === '/clips';

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      useAuthStore.getState().fetchUser().catch(() => {});
    }
  }, []);

  // Останавливаем плеер при переходе на страницу клипов
  useEffect(() => {
    if (isClipsPage) {
      const { isPlaying, togglePlay } = usePlayerStore.getState();
      if (isPlaying) togglePlay();
    }
  }, [isClipsPage]);

  return (
    <>
      <Component {...pageProps} />
      {/* Скрываем PlayerBar на странице клипов */}
      {!isClipsPage && <PlayerBar />}
    </>
  );
}

export default MyApp;
