import { useState } from 'react';
import api from '../lib/api';
import { useRouter } from 'next/router';

export default function DownloadButton({ trackId, trackTitle }) {
  const [downloading, setDownloading] = useState(false);
  const router = useRouter();

  const handleDownload = async (e) => {
    e.stopPropagation();
    
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    setDownloading(true);
    try {
      const response = await api.get(`/music/download/${trackId}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${trackTitle}.mp3`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Ошибка скачивания:', err);
      if (err.response?.status === 401) {
        router.push('/login');
      } else {
        alert('Не удалось скачать трек');
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <i
      className={`fas fa-download download ${downloading ? 'fa-spinner fa-spin' : ''}`}
      onClick={handleDownload}
      style={{ 
        opacity: downloading ? 0.5 : 1,
        cursor: downloading ? 'wait' : 'pointer'
      }}
      title="Скачать трек"
    ></i>
  );
}