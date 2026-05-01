import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import ProtectedRoute from '../../components/ProtectedRoute';
import Modal from '../../components/Modal';

export default function AdminSubmissions() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState(null);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchSubmissions();
    }
  }, [user]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/submissions/pending');
      setSubmissions(res.data || []);
    } catch (err) {
      console.error('Ошибка загрузки заявок:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setProcessingId(id);
    try {
      await api.put(`/admin/submissions/${id}/approve`);
      fetchSubmissions();
    } catch (err) {
      console.error('Ошибка одобрения:', err);
      alert('Не удалось одобрить заявку');
    } finally {
      setProcessingId(null);
      setSelectedSubmission(null);
      if (audioBlobUrl) {
        URL.revokeObjectURL(audioBlobUrl);
        setAudioBlobUrl(null);
      }
    }
  };

  const handleReject = async (id) => {
    setProcessingId(id);
    try {
      await api.put(`/admin/submissions/${id}/reject`);
      fetchSubmissions();
    } catch (err) {
      console.error('Ошибка отклонения:', err);
      alert('Не удалось отклонить заявку');
    } finally {
      setProcessingId(null);
      setSelectedSubmission(null);
      if (audioBlobUrl) {
        URL.revokeObjectURL(audioBlobUrl);
        setAudioBlobUrl(null);
      }
    }
  };

  const openSubmissionDetails = async (submission) => {
    setSelectedSubmission(submission);
    setAudioError(false);
    if (audioBlobUrl) {
      URL.revokeObjectURL(audioBlobUrl);
      setAudioBlobUrl(null);
    }
    if (submission.track?.id) {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/music/listen/${submission.track.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAudioBlobUrl(url);
      } catch (err) {
        console.error('Ошибка загрузки аудио:', err);
        setAudioError(true);
      }
    }
  };

  const closeDetails = () => {
    setSelectedSubmission(null);
    if (audioBlobUrl) {
      URL.revokeObjectURL(audioBlobUrl);
      setAudioBlobUrl(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="admin">
        <Layout>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: 'var(--accent)' }}></i>
            <p>Загрузка заявок...</p>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <Layout>
        <div className="profile-container">
          <h2>Заявки на модерацию</h2>

          {submissions.length === 0 ? (
            <div
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: '20px',
                padding: '60px',
                textAlign: 'center',
                border: '1px solid var(--border)',
              }}
            >
              <i className="fas fa-check-circle" style={{ fontSize: '48px', color: '#28a745', marginBottom: '16px' }}></i>
              <h3>Нет ожидающих заявок</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Все заявки обработаны</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {submissions.map((sub) => {
                const artist = sub.artist;
                const track = sub.track;
                return (
                  <div
                    key={sub.id}
                    style={{
                      padding: '20px',
                      background: 'var(--bg-elevated)',
                      borderRadius: '16px',
                      border: '1px solid var(--border)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '15px',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            flexWrap: 'wrap',
                            marginBottom: '12px',
                          }}
                        >
                          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                            {track?.title || 'Без названия'}
                          </h3>
                          <span
                            style={{
                              background: 'rgba(255, 193, 7, 0.1)',
                              color: '#ffc107',
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                            }}
                          >
                            Ожидает
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          <strong>Артист:</strong> {artist?.name || track?.artist_name || 'Неизвестный артист'}
                        </p>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          <strong>Длительность:</strong> {formatDuration(track?.duration)}
                        </p>
                        {track?.genres && track.genres.length > 0 && (
                          <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            <strong>Жанры:</strong> {track.genres.map((g) => g.name).join(', ')}
                          </p>
                        )}
                        {artist?.bio && (
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>
                            <strong>О себе:</strong> {artist.bio.substring(0, 100)}...
                          </p>
                        )}
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>
                          <i className="far fa-clock" style={{ marginRight: '5px' }}></i>
                          Загружено: {formatDate(sub.submitted_at)}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button
                          className="btn-secondary"
                          onClick={() => openSubmissionDetails(sub)}
                          style={{ padding: '8px 16px' }}
                        >
                          <i className="fas fa-info-circle"></i> Подробнее
                        </button>
                        <button
                          className="btn"
                          onClick={() => handleApprove(sub.id)}
                          disabled={processingId === sub.id}
                          style={{
                            background: 'linear-gradient(135deg, #28a745, #20c997)',
                            padding: '8px 20px',
                          }}
                        >
                          {processingId === sub.id ? <i className="fas fa-spinner fa-spin"></i> : 'Одобрить'}
                        </button>
                        <button
                          className="btn-secondary reject-btn"
                          onClick={() => handleReject(sub.id)}
                          disabled={processingId === sub.id}
                        >
                          {processingId === sub.id ? <i className="fas fa-spinner fa-spin"></i> : 'Отклонить'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Modal isOpen={!!selectedSubmission} onClose={closeDetails}>
          {selectedSubmission &&
            (() => {
              const artist = selectedSubmission.artist;
              const track = selectedSubmission.track;

              return (
                <div style={{ maxWidth: '700px', width: '100%' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '24px',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontSize: '1.5rem',
                        background: 'linear-gradient(135deg, #fff, var(--accent-light))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      Детали заявки
                    </h2>
                    <span
                      style={{
                        background: 'rgba(255, 193, 7, 0.1)',
                        color: '#ffc107',
                        padding: '4px 16px',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                      }}
                    >
                      На модерации
                    </span>
                  </div>

                  {track?.id && (
                    <div style={{ marginBottom: '24px' }}>
                      <h3
                        style={{
                          marginBottom: '16px',
                          color: 'var(--accent-light)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <i className="fas fa-headphones"></i> Прослушивание
                      </h3>
                      <div
                        style={{
                          background: 'var(--bg-secondary)',
                          borderRadius: '16px',
                          padding: '20px',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <audio
                          ref={audioRef}
                          controls
                          src={audioBlobUrl}
                          style={{ width: '100%', marginTop: '8px' }}
                          onError={() => setAudioError(true)}
                          onCanPlay={() => setAudioError(false)}
                        />
                        {audioError && (
                          <p style={{ marginTop: '12px', fontSize: '0.8rem', color: '#ff6b6b' }}>
                            <i className="fas fa-exclamation-triangle"></i> Не удалось загрузить трек. Возможно, файл отсутствует.
                          </p>
                        )}
                        <p style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <i className="fas fa-info-circle"></i> Предварительное прослушивание трека
                        </p>
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: '24px' }}>
                    <h3
                      style={{
                        marginBottom: '16px',
                        color: 'var(--accent-light)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <i className="fas fa-music"></i> Информация о треке
                    </h3>
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '20px' }}>
                      <p>
                        <strong>Название:</strong> {track?.title || '—'}
                      </p>
                      <p>
                        <strong>Длительность:</strong> {formatDuration(track?.duration)}
                      </p>
                      {track?.genres && track.genres.length > 0 && (
                        <p>
                          <strong>Жанры:</strong> {track.genres.map((g) => g.name).join(', ')}
                        </p>
                      )}
                      {track?.cover && (
                        <div>
                          <strong>Обложка:</strong>
                          <div>
                            <img
                              src={`${process.env.NEXT_PUBLIC_API_URL}/${track.cover}`}
                              alt="cover"
                              style={{
                                width: '100px',
                                height: '100px',
                                borderRadius: '8px',
                                objectFit: 'cover',
                                marginTop: '8px',
                                cursor: 'pointer',
                              }}
                              onClick={() =>
                                window.open(
                                  `${process.env.NEXT_PUBLIC_API_URL}/${track.cover}`,
                                  '_blank'
                                )
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h3
                      style={{
                        marginBottom: '16px',
                        color: 'var(--accent-light)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <i className="fas fa-user"></i> Информация об артисте
                    </h3>
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '20px' }}>
                      <p>
                        <strong>Имя:</strong> {artist?.name || track?.artist_name || '—'}
                      </p>
                      {artist?.bio && (
                        <>
                          <p>
                            <strong>Биография:</strong>
                          </p>
                          <p style={{ whiteSpace: 'pre-wrap' }}>{artist.bio}</p>
                        </>
                      )}
                      {artist?.avatar && (
                        <div>
                          <strong>Аватар:</strong>
                          <div>
                            <img
                              src={`${process.env.NEXT_PUBLIC_API_URL}/${artist.avatar}`}
                              alt="avatar"
                              style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                marginTop: '8px',
                                cursor: 'pointer',
                              }}
                              onClick={() =>
                                window.open(
                                  `${process.env.NEXT_PUBLIC_API_URL}/${artist.avatar}`,
                                  '_blank'
                                )
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h3
                      style={{
                        marginBottom: '16px',
                        color: 'var(--accent-light)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <i className="fas fa-info-circle"></i> Информация о заявке
                    </h3>
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '20px' }}>
                      <p>
                        <strong>ID заявки:</strong> {selectedSubmission.id}
                      </p>
                      <p>
                        <strong>Дата подачи:</strong> {formatDate(selectedSubmission.submitted_at)}
                      </p>
                      <p>
                        <strong>Статус:</strong> <span style={{ color: '#ffc107' }}>Ожидает рассмотрения</span>
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button className="btn-secondary" onClick={closeDetails}>
                      Закрыть
                    </button>
                    <button
                      className="btn"
                      onClick={() => handleApprove(selectedSubmission.id)}
                      disabled={processingId === selectedSubmission.id}
                      style={{ background: 'linear-gradient(135deg, #28a745, #20c997)' }}
                    >
                      {processingId === selectedSubmission.id ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : (
                        'Одобрить'
                      )}
                    </button>
                    <button
                      className="btn-secondary reject-btn"
                      onClick={() => handleReject(selectedSubmission.id)}
                      disabled={processingId === selectedSubmission.id}
                    >
                      {processingId === selectedSubmission.id ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : (
                        'Отклонить'
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}
        </Modal>
      </Layout>
    </ProtectedRoute>
  );
}