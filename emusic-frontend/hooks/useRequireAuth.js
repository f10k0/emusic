import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import useAuthStore from '../store/authStore';

/**
 * Waits for auth to resolve before redirecting.
 * Fixes F5 flash-redirect when token exists but user not yet loaded.
 */
export default function useRequireAuth() {
  const router = useRouter();
  const { user, fetchUser } = useAuthStore();
  const [ready, setReady] = useState(!!user); // already ready if user in memory

  useEffect(() => {
    if (user) { setReady(true); return; }

    let cancelled = false;
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('access_token') : null;

    if (!token) {
      router.replace('/login');
      return;
    }

    // Token exists, wait for user to load
    fetchUser()
      .then(() => { if (!cancelled) setReady(true); })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem('access_token');
          router.replace('/login');
        }
      });

    return () => { cancelled = true; };
  }, []);

  // Also react if user loads after initial check
  useEffect(() => {
    if (user && !ready) setReady(true);
  }, [user]);

  return { user, ready };
}
