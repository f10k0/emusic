import { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import ProtectedRoute from '../../components/ProtectedRoute';
import Modal from '../../components/Modal';

export default function AdminNews() {
  const toast = useToast();
  const { user } = useAuthStore();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    image: '',
    is_published: true
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchNews();
    }
  }, [user]);

  const fetchNews = async () => {
    try {
      const res = await api.get('/news');
      setNews(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ title: '', content: '', image: '', is_published: true });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      content: item.content,
      image: item.image || '',
      is_published: item.is_published
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let response;
      if (editingId) {
        response = await api.put(`/news/${editingId}`, form);
      } else {
        response = await api.post('/news', form);
        setEditingId(response.data.id); // сохраняем ID для последующей загрузки изображения
      }
      
      // Если есть файл для загрузки, загружаем после создания/обновления
      if (window.tempImageFile) {
        const formData = new FormData();
        formData.append('file', window.tempImageFile);
        await api.post(`/news/${response.data.id}/image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        delete window.tempImageFile;
      }
      
      setShowModal(false);
      fetchNews();
    } catch (err) {
      console.error(err);
      toast('Ошибка сохранения', 'success');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      if (editingId) {
        // Если редактируем существующую новость, загружаем сразу
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post(`/news/${editingId}/image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setForm(prev => ({ ...prev, image: res.data.image_url }));
      } else {
        // Если создаём новую, сохраняем файл для загрузки после создания
        window.tempImageFile = file;
        // Временный URL для предпросмотра
        const previewUrl = URL.createObjectURL(file);
        setForm(prev => ({ ...prev, image: previewUrl }));
      }
    } catch (err) {
      console.error('Ошибка загрузки изображения:', err);
      toast('Ошибка загрузки изображения', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить новость?')) return;
    try {
      await api.delete(`/news/${id}`);
      fetchNews();
    } catch (err) {
      console.error(err);
      toast('Ошибка удаления', 'error');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="admin">
        <Layout>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: 'var(--accent)' }}></i>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <Layout>
        <div className="profile-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2>Управление новостями</h2>
            <button className="btn" onClick={openCreateModal}>
              <i className="fas fa-plus"></i> Создать новость
            </button>
          </div>

          {news.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <i className="fas fa-newspaper" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
              <p>Нет новостей</p>
            </div>
          ) : (
            <div className="track-list">
              {news.map(item => (
                <div key={item.id} className="track-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                    {item.image && (
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL}/${item.image}`}
                        alt=""
                        style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <h4>{item.title}</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(item.created_at).toLocaleDateString('ru-RU')}
                      </p>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {item.content.substring(0, 100)}...
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button className="btn-secondary" onClick={() => openEditModal(item)}>
                      <i className="fas fa-edit"></i> Редактировать
                    </button>
                    <button className="btn-secondary" style={{ color: '#ff6b6b' }} onClick={() => handleDelete(item.id)}>
                      <i className="fas fa-trash"></i> Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
          <h2>{editingId ? 'Редактировать новость' : 'Создать новость'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Заголовок</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Содержание</label>
              <textarea
                name="content"
                value={form.content}
                onChange={handleChange}
                rows="8"
                required
              />
            </div>
            <div className="form-group">
              <label>Изображение</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
              />
              {form.image && (
                <div style={{ marginTop: '10px' }}>
                  <img
                    src={form.image.startsWith('http') ? form.image : `${process.env.NEXT_PUBLIC_API_URL}/${form.image}`}
                    alt=""
                    style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}
              <small>Можно загрузить изображение</small>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="is_published"
                  checked={form.is_published}
                  onChange={handleChange}
                /> Опубликовано
              </label>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Отмена</button>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </form>
        </Modal>
      </Layout>
    </ProtectedRoute>
  );
}