import React, { useState, useRef } from 'react';
import api from '../lib/api';

export default function CreatePlaylistForm({ onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Файл слишком большой (макс. 5MB)');
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    // Очищаем предыдущий preview URL
    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
    }

    const newPreview = URL.createObjectURL(file);
    console.log('Preview URL:', newPreview); // для отладки
    setCoverPreview(newPreview);
    setCoverFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Введите название плейлиста');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('is_public', String(isPublic));
      if (coverFile) {
        formData.append('cover', coverFile);
      }

      await api.post('/playlists', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Ошибка:', err);
      if (err.response?.status === 401) {
        alert('Сессия истекла. Пожалуйста, войдите заново.');
      } else {
        alert('Не удалось создать плейлист. Проверьте подключение к серверу.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ marginBottom: '20px' }}>Новый плейлист</h3>
      <form onSubmit={handleSubmit}>
        {/* Блок обложки */}
        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
          {coverPreview ? (
            <img
              src={coverPreview}
              alt="Обложка"
              style={{
                width: '200px',
                height: '200px',
                borderRadius: '12px',
                objectFit: 'cover',
                border: '3px solid var(--accent)',
              }}
              onError={(e) => {
                console.error('Ошибка загрузки превью', e);
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div
              style={{
                width: '200px',
                height: '200px',
                borderRadius: '12px',
                border: '3px solid var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-muted)',
                margin: '0 auto',
              }}
            >
              Нет обложки
            </div>
          )}
          <div style={{ marginTop: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              Загрузить обложку
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverChange}
            style={{ display: 'none' }}
          />
        </div>

        {/* Поля ввода */}
        <div className="form-group">
          <label htmlFor="name">Название</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Введите название плейлиста"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Описание</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="3"
            placeholder="Опишите ваш плейлист (необязательно)"
          />
        </div>

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span>{isPublic ? 'Публичный плейлист' : 'Приватный плейлист'}</span>
          </label>
        </div>

        {/* Кнопки */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Отмена
          </button>
          <button type="submit" className="btn" disabled={loading || !name.trim()}>
            {loading ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </form>
    </div>
  );
}