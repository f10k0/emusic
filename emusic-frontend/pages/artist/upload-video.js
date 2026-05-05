import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function UploadVideo() {
  const router = useRouter();
  const [form, setForm] = useState({ title: '', description: '' });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Выберите видеофайл'); return; }
    if (!form.title.trim()) { setError('Введите название клипа'); return; }
    if (file.size > 50 * 1024 * 1024) { setError('Файл слишком большой (максимум 50 МБ)'); return; }

    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('file', file);
      await api.post('/videos/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (pe) => setProgress(Math.round((pe.loaded * 100) / pe.total)),
      });
      router.push('/clips');
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка загрузки');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <ProtectedRoute requiredRole="artist">
      <Layout>
        <div style={{ padding: '32px 24px' }}>
          <div className="upload-video-form">
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 6 }}>
              <i className="fas fa-video" style={{ color: 'var(--accent)', marginRight: 10 }}></i>
              Загрузить клип
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>Формат MP4, максимум 60 секунд, до 50 МБ</p>

            {error && <div style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid #ff5050', borderRadius: 10, padding: '12px 16px', color: '#ff5050', marginBottom: 20 }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="form-group">
                <label className="form-label">Название клипа *</label>
                <input
                  className="form-control"
                  value={form.title}
                  onChange={e => setForm(s => ({ ...s, title: e.target.value }))}
                  placeholder="Название вашего клипа"
                  maxLength={100}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Описание</label>
                <textarea
                  className="form-control"
                  value={form.description}
                  onChange={e => setForm(s => ({ ...s, description: e.target.value }))}
                  placeholder="Кратко о клипе, хэштеги…"
                  rows={3}
                  maxLength={500}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Видеофайл *</label>
                <input
                  type="file"
                  accept="video/mp4,video/*"
                  className="form-control"
                  onChange={e => setFile(e.target.files[0])}
                />
                {file && (
                  <p style={{ marginTop: 6, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {file.name} — {(file.size / 1024 / 1024).toFixed(1)} МБ
                  </p>
                )}
              </div>

              {loading && progress > 0 && (
                <div>
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--accent-gradient)', width: `${progress}%`, transition: 'width 0.3s' }}></div>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>Загрузка: {progress}%</p>
                </div>
              )}

              <button type="submit" className="btn" disabled={loading} style={{ padding: '12px 24px', alignSelf: 'flex-start' }}>
                {loading ? <><i className="fas fa-spinner fa-spin"></i> Загрузка…</> : <><i className="fas fa-upload"></i> Опубликовать клип</>}
              </button>
            </form>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
