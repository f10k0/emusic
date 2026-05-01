import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import useAuthStore from '../store/authStore';

export default function ProtectedRoute({ children, requiredRole = null }) {
  const router = useRouter();
  const { user, fetchUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        console.log('Нет токена, редирект на /login');
        router.replace('/login');
        return;
      }

      if (!user) {
        try {
          console.log('Загрузка пользователя в ProtectedRoute...');
          await fetchUser();
        } catch (error) {
          console.error('Ошибка загрузки пользователя:', error);
          router.replace('/login');
          return;
        }
      }

      setIsLoading(false);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      if (requiredRole && user.role !== requiredRole) {
        console.log(`Роль ${user.role} не соответствует требуемой ${requiredRole}`);
        router.replace('/');
      }
    }
  }, [isLoading, user, requiredRole]);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '48px', color: 'var(--accent)', marginBottom: '20px' }}></i>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (requiredRole && user?.role !== requiredRole) {
    return null;
  }

  return children;
}