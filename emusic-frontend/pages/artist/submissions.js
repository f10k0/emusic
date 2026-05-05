import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import ProtectedRoute from '../../components/ProtectedRoute';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const STATUS_CONFIG = {
  pending:  { bg: 'rgba(255,193,7,0.12)',  color: '#ffc107', icon: 'fa-clock',       label: 'На проверке' },
  approved: { bg: 'rgba(40,167,69,0.12)',  color: '#28a745', icon: 'fa-check-circle', label: 'Одобрен'     },
  rejected: { bg: 'rgba(220,53,69,0.12)',  color: '#dc3545', icon: 'fa-times-circle', label: 'Отклонён'    },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.color,
      padding: '5px 13px', borderRadius: 20,
      fontSize: '0.82rem', fontWeight: 700,
      border: `1px solid ${cfg.color}33`,
    }}>
      <i className={`fas ${cfg.icon}`}></i>
      {cfg.label}
    </span>
  );
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDuration(sec) {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function Submissions() {
  const router = useRouter();
  const { success } = router.query;
  const [showSuccess, setShowSuccess] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (success === 'true') {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [success]);

  useEffect(() => { fetchSubmissions(); }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const r = await api.get('/submissions/my?limit=50');
      setSubmissions(r.data || []);
    } catch {
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const displayed = showAll ? submissions : submissions.slice(0, 3);
  const stats = {
    total: submissions.length,
    approved: submissions.filter(s => s.status === 'approved').length,
    pending: submissions.filter(s => s.status === 'pending').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
  };

  return (
    <ProtectedRoute requiredRole="artist">
      <Layout>
        <div className="profile-container">
          {/* Шапка */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ marginBottom: 4 }}>
                <i className="fas fa-clock" style={{ color: 'var(--accent)', marginRight: 10 }}></i>
                Мои заявки
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                История отправленных треков на модерацию
              </p>
            </div>
            <Link href="/artist/upload" className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', textDecoration: 'none' }}>
              <i className="fas fa-upload"></i> Загрузить трек
            </Link>
          </div>

          {/* Уведомление об успехе */}
          {showSuccess && (
            <div style={{ background: 'rgba(40,167,69,0.1)', border: '1px solid #28a745', borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
              <i className="fas fa-check-circle" style={{ color: '#28a745', fontSize: '1.4rem', flexShrink: 0 }}></i>
              <div>
                <strong>Трек успешно загружен!</strong>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 2 }}>Отправлен на модерацию. Статус появится в списке ниже.</p>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
            </div>
          ) : submissions.length === 0 ? (
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 16, padding: 48, textAlign: 'center', border: '1px solid var(--border)' }}>
              <i className="fas fa-music" style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: 16, display: 'block', opacity: 0.4 }}></i>
              <h3 style={{ marginBottom: 8 }}>Заявок пока нет</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Загрузите первый трек — он появится здесь</p>
              <Link href="/artist/upload" className="btn" style={{ textDecoration: 'none', padding: '10px 24px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-upload"></i> Загрузить трек
              </Link>
            </div>
          ) : (
            <>
              {/* Краткая статистика */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Всего', value: stats.total, color: 'var(--text-primary)' },
                  { label: 'Одобрено', value: stats.approved, color: '#28a745' },
                  { label: 'На проверке', value: stats.pending, color: '#ffc107' },
                  { label: 'Отклонено', value: stats.rejected, color: '#dc3545' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Список заявок */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {displayed.map((sub, idx) => {
                  const cfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.pending;
                  const isLatest = idx === 0;
                  return (
                    <div key={sub.id} style={{
                      background: 'var(--bg-elevated)',
                      borderRadius: 14,
                      border: `1px solid ${sub.status === 'rejected' ? 'rgba(220,53,69,0.25)' : sub.status === 'approved' ? 'rgba(40,167,69,0.2)' : 'var(--border)'}`,
                      overflow: 'hidden',
                      display: 'flex',
                      gap: 0,
                      position: 'relative',
                    }}>
                      {/* Цветная полоска слева */}
                      <div style={{ width: 4, background: cfg.color, flexShrink: 0, opacity: 0.7 }} />

                      {/* Обложка */}
                      <div style={{ width: 72, flexShrink: 0, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {sub.track?.cover ? (
                          <img
                            src={`${API}/${sub.track.cover}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            onError={e => { e.target.src = '/default-cover.png'; }}
                            alt=""
                          />
                        ) : (
                          <i className="fas fa-music" style={{ fontSize: '1.4rem', color: 'var(--text-muted)', opacity: 0.4 }}></i>
                        )}
                      </div>

                      {/* Инфо */}
                      <div style={{ flex: 1, padding: '12px 16px', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                            {sub.track?.title || 'Без названия'}
                          </span>
                          {isLatest && (
                            <span style={{ background: 'rgba(136,51,255,0.15)', color: 'var(--accent-light)', fontSize: '0.7rem', padding: '1px 7px', borderRadius: 8, fontWeight: 600 }}>
                              Последняя
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 14, fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                          <span>
                            <i className="fas fa-paper-plane" style={{ marginRight: 4 }}></i>
                            Отправлена: {formatDate(sub.submitted_at)}
                          </span>
                          {sub.reviewed_at && (
                            <span>
                              <i className="fas fa-check" style={{ marginRight: 4 }}></i>
                              Рассмотрена: {formatDate(sub.reviewed_at)}
                            </span>
                          )}
                          {sub.track?.duration && (
                            <span>
                              <i className="fas fa-clock" style={{ marginRight: 4 }}></i>
                              {formatDuration(sub.track.duration)}
                            </span>
                          )}
                          {sub.track?.is_published && (
                            <span>
                              <i className="fas fa-headphones" style={{ marginRight: 4 }}></i>
                              {sub.track.play_count || 0} прослушиваний
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Статус */}
                      <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0 }}>
                        <StatusBadge status={sub.status} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Кнопка показать все */}
              {submissions.length > 3 && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <button
                    className="btn-secondary"
                    onClick={() => setShowAll(v => !v)}
                    style={{ padding: '9px 24px', fontSize: '0.88rem' }}
                  >
                    {showAll
                      ? <><i className="fas fa-chevron-up" style={{ marginRight: 6 }}></i>Свернуть</>
                      : <><i className="fas fa-chevron-down" style={{ marginRight: 6 }}></i>Показать все ({submissions.length})</>
                    }
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
