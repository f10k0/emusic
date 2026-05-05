import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import ProtectedRoute from '../../components/ProtectedRoute';
import Link from 'next/link';

function formatSeconds(s) {
  if (!s) return '0 мин';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} ч ${m} мин`;
  return `${m} мин`;
}

export default function StatsPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const API = process.env.NEXT_PUBLIC_API_URL;

  const fetchStats = async (p = period) => {
    setLoading(true);
    try {
      const r = await api.get(`/users/me/stats?period=${p}`);
      setStats(r.data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) fetchStats(); }, [user]);

  const rankClass = (i) => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';

  return (
    <ProtectedRoute>
      <Layout>
        <div style={{ padding: '32px 24px' }}>
          <div className="stats-page">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 4 }}>
                  <i className="fas fa-chart-bar" style={{ color: 'var(--accent)', marginRight: 10 }}></i>
                  Моя статистика
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Анализ ваших прослушиваний</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['week', 'month'].map(p => (
                  <button
                    key={p}
                    className={period === p ? 'btn' : 'btn-secondary'}
                    style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                    onClick={() => { setPeriod(p); fetchStats(p); }}
                  >
                    {p === 'week' ? '7 дней' : '30 дней'}
                  </button>
                ))}
                <button className="btn-secondary" onClick={() => fetchStats(period)} style={{ padding: '8px 14px' }} title="Обновить">
                  <i className="fas fa-sync-alt"></i>
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
              </div>
            ) : !stats ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                <i className="fas fa-headphones" style={{ fontSize: '3rem', marginBottom: 16, display: 'block', opacity: 0.4 }}></i>
                Данных пока нет. Слушайте музыку — и статистика появится!
              </div>
            ) : (
              <>
                {/* Сводка */}
                <div className="stats-summary">
                  <div className="stats-card">
                    <div className="stats-card-value">{stats.total_listens}</div>
                    <div className="stats-card-label"><i className="fas fa-headphones" style={{marginRight:5}}></i>Прослушиваний</div>
                  </div>
                  <div className="stats-card">
                    <div className="stats-card-value">{formatSeconds(stats.total_seconds)}</div>
                    <div className="stats-card-label"><i className="fas fa-clock" style={{marginRight:5}}></i>Время в музыке</div>
                  </div>
                  <div className="stats-card">
                    <div className="stats-card-value">{stats.top_artists?.length || 0}</div>
                    <div className="stats-card-label"><i className="fas fa-star" style={{marginRight:5}}></i>Любимых артистов</div>
                  </div>
                </div>

                {/* Топ треки */}
                {stats.top_tracks?.length > 0 && (
                  <div className="stats-section">
                    <h3><i className="fas fa-music" style={{color:"var(--accent)",marginRight:8}}></i>Топ треков</h3>
                    {stats.top_tracks.map((t, i) => (
                      <div key={t.id} className="stats-track-item">
                        <div className={`stats-rank ${rankClass(i)}`}>#{i + 1}</div>
                        <img
                          src={t.cover ? `${API}/${t.cover}` : '/default-cover.png'}
                          className="stats-track-cover"
                          onError={e => { e.target.src = '/default-cover.png'; }}
                          alt=""
                        />
                        <div className="stats-track-info">
                          <div className="stats-track-title">{t.title}</div>
                          <div className="stats-track-artist">{t.artist_name}</div>
                        </div>
                        <div className="stats-bar-wrap">
                          <div
                            className="stats-bar"
                            style={{ width: `${Math.round((t.count / (stats.top_tracks[0]?.count || 1)) * 100)}%` }}
                          ></div>
                        </div>
                        <div className="stats-count">{t.count}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Топ артисты */}
                {stats.top_artists?.length > 0 && (
                  <div className="stats-section">
                    <h3><i className="fas fa-microphone-alt" style={{color:"var(--accent)",marginRight:8}}></i>Топ артистов</h3>
                    {stats.top_artists.map((a, i) => (
                      <Link key={a.id} href={`/artist/${a.id}`} style={{ textDecoration: 'none' }}>
                        <div className="stats-track-item" style={{ cursor: 'pointer', transition: 'background 0.15s' }}>
                          <div className={`stats-rank ${rankClass(i)}`}>#{i + 1}</div>
                          <img
                            src={a.avatar ? `${API}/${a.avatar}` : '/default-artist.jpg'}
                            className="stats-track-cover"
                            style={{ borderRadius: '50%' }}
                            onError={e => { e.target.src = '/default-artist.jpg'; }}
                            alt=""
                          />
                          <div className="stats-track-info">
                            <div className="stats-track-title">{a.name}</div>
                          </div>
                          <div className="stats-bar-wrap">
                            <div
                              className="stats-bar"
                              style={{ width: `${Math.round((a.count / (stats.top_artists[0]?.count || 1)) * 100)}%` }}
                            ></div>
                          </div>
                          <div className="stats-count">{a.count}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Жанры */}
                {stats.genres?.length > 0 && (
                  <div className="stats-section">
                    <h3><i className="fas fa-guitar" style={{color:"var(--accent)",marginRight:8}}></i>Любимые жанры</h3>
                    <div>
                      {stats.genres.slice(0, 12).map(g => (
                        <span key={g.name} className="genre-chip">
                          {g.name}
                          <span className="genre-chip-count">{g.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {stats.total_listens === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <i className="fas fa-headphones" style={{ fontSize: '3rem', marginBottom: 16, display: 'block', opacity: 0.4 }}></i>
                    За этот период нет прослушиваний. Включите музыку!
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
