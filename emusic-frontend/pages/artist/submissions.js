import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import ProtectedRoute from '../../components/ProtectedRoute';
import Link from 'next/link';

export default function Submissions() {
  const router = useRouter();
  const { success } = router.query;
  const [showSuccess, setShowSuccess] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (success === 'true') {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      // TODO: когда появится эндпоинт GET /submissions/my
      // const res = await api.get('/submissions/my');
      // setSubmissions(res.data);
      
      // Пока заглушка
      setSubmissions([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: 'rgba(255, 193, 7, 0.1)', color: '#ffc107', text: 'На проверке' },
      approved: { bg: 'rgba(40, 167, 69, 0.1)', color: '#28a745', text: 'Опубликован' },
      rejected: { bg: 'rgba(220, 53, 69, 0.1)', color: '#dc3545', text: 'Отклонён' }
    };
    const style = styles[status] || styles.pending;
    return (
      <span style={{ 
        backgroundColor: style.bg,
        color: style.color,
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '0.85rem',
        fontWeight: '600'
      }}>
        {style.text}
      </span>
    );
  };

  // Безопасное получение названия трека
  const getTrackTitle = (submission) => {
    if (!submission.track) return 'Без названия';
    if (typeof submission.track === 'object') {
      return submission.track.title || 'Без названия';
    }
    return String(submission.track);
  };

  // Безопасное получение URL обложки
  const getTrackCover = (submission) => {
    if (!submission.track) return '/default-cover.png';
    if (typeof submission.track === 'object') {
      return submission.track.cover || '/default-cover.png';
    }
    return '/default-cover.png';
  };

  // Безопасное форматирование даты
  const formatDate = (dateString) => {
    if (!dateString) return 'Дата неизвестна';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return 'Дата неизвестна';
    }
  };

  return (
    <ProtectedRoute requiredRole="artist">
      <Layout>
        <div className="profile-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2>Мои заявки</h2>
            <Link href="/artist/upload" className="btn">
              <i className="fas fa-upload" style={{ marginRight: '8px' }}></i>
              Загрузить новый трек
            </Link>
          </div>

          {showSuccess && (
            <div style={{ 
              backgroundColor: 'rgba(40, 167, 69, 0.1)', 
              border: '1px solid #28a745', 
              borderRadius: '12px', 
              padding: '16px', 
              marginBottom: '25px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <i className="fas fa-check-circle" style={{ color: '#28a745', fontSize: '24px' }}></i>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Трек успешно загружен!</strong>
                <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Он отправлен на модерацию. Мы уведомим вас, когда статус изменится.
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: 'var(--accent)' }}></i>
              <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Загрузка заявок...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div style={{ 
              backgroundColor: 'var(--bg-secondary)', 
              borderRadius: '20px', 
              padding: '40px', 
              textAlign: 'center',
              border: '1px solid var(--border)'
            }}>
              <i className="fas fa-music" style={{ fontSize: '48px', color: 'var(--text-muted)', marginBottom: '16px' }}></i>
              <h3 style={{ marginBottom: '8px' }}>У вас пока нет загруженных треков</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                Загрузите свой первый трек, чтобы он появился здесь
              </p>
              <Link href="/artist/upload" className="btn">
                Загрузить трек
              </Link>
            </div>
          ) : (
            <div className="track-list">
              {submissions.map(sub => (
                <div key={sub.id} className="track-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <img 
                        src={getTrackCover(sub)}
                        style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover' }}
                        alt={getTrackTitle(sub)}
                      />
                      <div>
                        <h4 style={{ marginBottom: '4px' }}>{getTrackTitle(sub)}</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          Загружен: {formatDate(sub.submitted_at)}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(sub.status)}
                  </div>
                  {sub.reviewed_at && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '10px' }}>
                      <i className="fas fa-clock" style={{ marginRight: '5px' }}></i>
                      Рассмотрено: {formatDate(sub.reviewed_at)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}