import { useEffect } from 'react';
import '../styles/globals.css';
import useAuthStore from '../store/authStore';
import PlayerBar from '../components/PlayerBar';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      useAuthStore.getState().fetchUser().catch(() => {});
    }
  }, []);

  return (
    <>
      <Component {...pageProps} />
      <PlayerBar />
    </>
  );
}

export default MyApp;