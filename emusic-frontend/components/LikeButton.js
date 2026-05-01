import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useRouter } from 'next/router';

export default function LikeButton({ item, type = 'tracks', initialState = false, onToggle }) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(initialState);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsLiked(initialState);
  }, [initialState]);

  const toggleLike = async (e) => {
    e.stopPropagation();
    
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    const newState = !isLiked;
    setIsLiked(newState);
    setLoading(true);

    try {
      console.log(`🔄 Отправка запроса: POST /favorites/${type}/${item.id}`);
      const response = await api.post(`/favorites/${type}/${item.id}`);
      console.log('✅ Ответ сервера:', response.data);
      if (onToggle) onToggle(newState);
    } catch (err) {
      console.error('❌ Ошибка при добавлении в избранное:', err);
      if (err.response) {
        console.error('Статус:', err.response.status);
        console.error('Данные:', err.response.data);
      }
      setIsLiked(!newState); // возвращаем обратно
    } finally {
      setLoading(false);
    }
  };

  return (
    <i
      className={`fas fa-heart ${isLiked ? 'active' : ''}`}
      onClick={toggleLike}
      style={{ 
        opacity: loading ? 0.5 : 1,
        cursor: loading ? 'wait' : 'pointer',
        transition: 'all 0.2s',
      }}
    ></i>
  );
}