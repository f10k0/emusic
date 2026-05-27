import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import { useRouter } from 'next/router';

export default function AdminGamification() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [ecoins, setEcoins] = useState('');
  const [level, setLevel] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('success');
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== 'admin') { router.push('/'); return; }
    if (user) loadUsers();
  }, [user]);

  async function loadUsers() {
    setUsersLoading(true);
    try {
      // Admin users endpoint is at /admin/users
      const { data } = await api.get('/admin/users', { params: { limit: 200 } });
      setUsers(data);
    } catch (e) {
      console.error('Failed to load users:', e);
    }
    setUsersLoading(false);
  }

  async function selectUser(u) {
    setSelected(u);
    setEcoins('');
    setLevel('');
    setMsg('');
    setUserProgress(null);
    try {
      const { data } = await api.get(`/gamification/admin/user/${u.id}/progress`);
      setUserProgress(data);
    } catch {}
  }

  function showMsg(text, type = 'success') {
    setMsg(text);
    setMsgType(type);
  }

  async function saveEcoins() {
    if (!selected || ecoins === '') return;
    try {
      setLoading(true);
      const { data } = await api.put(`/gamification/admin/user/${selected.id}/ecoins`, null, {
        params: { amount: parseInt(ecoins) }
      });
      showMsg(`Ecoins установлены: ${data.ecoins}`);
      setUserProgress(p => ({ ...p, ecoins: data.ecoins }));
      setEcoins('');
    } catch (e) {
      showMsg(e?.response?.data?.detail || 'Ошибка', 'error');
    } finally { setLoading(false); }
  }

  async function saveLevel() {
    if (!selected || level === '') return;
    try {
      setLoading(true);
      const { data } = await api.put(`/gamification/admin/user/${selected.id}/level`, null, {
        params: { level: parseInt(level) }
      });
      showMsg(`Уровень установлен: ${data.level}`);
      setUserProgress(p => ({ ...p, level: data.level }));
      setLevel('');
    } catch (e) {
      showMsg(e?.response?.data?.detail || 'Ошибка', 'error');
    } finally { setLoading(false); }
  }

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const inp = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg)',
    color: 'var(--text)', fontSize: '0.9rem', boxSizing: 'border-box',
  };

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-trophy" style={{ color: 'var(--accent)' }}></i>
            Управление геймификацией
          </h1>
          <button
            onClick={async () => {
              if (!confirm('Инициализировать данные магазина и квестов (если их нет)?')) return;
              try {
                const { data } = await api.post('/gamification/admin/seed');
                alert(`Квестов: ${data.quests}, предметов магазина: ${data.shop_items}`);
              } catch (e) { alert('Ошибка инициализации'); }
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)', cursor: 'pointer', fontSize: '0.86rem' }}
          >
            <i className="fas fa-seedling" style={{ color: 'var(--accent)' }}></i>
            Инициализировать данные
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* User list */}
          <div>
            <div style={{ marginBottom: 10 }}>
              <input type="text" placeholder="Поиск пользователя..." value={search}
                onChange={e => setSearch(e.target.value)} style={inp} />
            </div>
            <div style={{ maxHeight: 500, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
              {usersLoading ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>Загрузка...
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <i className="fas fa-user-slash" style={{ marginRight: 8 }}></i>
                  {search ? 'Пользователи не найдены' : 'Список пользователей пуст'}
                </div>
              ) : filtered.map(u => (
                <div key={u.id} onClick={() => selectUser(u)} style={{
                  padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                  background: selected?.id === u.id ? 'var(--accent)22' : 'transparent',
                  transition: 'background 0.15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fas fa-user" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}></i>
                    <span style={{ fontWeight: 600 }}>{u.username}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg)', padding: '1px 7px', borderRadius: 10, border: '1px solid var(--border)' }}>
                      {u.role}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>{u.email}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {filtered.length} пользователей
            </div>
          </div>

          {/* Edit panel */}
          <div>
            {!selected ? (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)', padding: 30, textAlign: 'center', color: 'var(--text-secondary)' }}>
                <i className="fas fa-hand-pointer" style={{ fontSize: '2rem', marginBottom: 12, opacity: 0.4, display: 'block' }}></i>
                Выберите пользователя из списка слева
              </div>
            ) : (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
                <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fas fa-user-edit" style={{ color: 'var(--accent)' }}></i>
                  {selected.username}
                  <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}>#{selected.id}</span>
                </h3>

                {/* Current progress */}
                {userProgress ? (
                  <div style={{ background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 20 }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 10 }}>Текущие показатели</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                      {[
                        { icon: 'fa-star', label: 'Уровень', value: userProgress.level, color: '#ffb300' },
                        { icon: 'fa-coins', label: 'Ecoins', value: userProgress.ecoins, color: '#ffb300' },
                        { icon: 'fa-headphones', label: 'Часов', value: userProgress.total_listen_hours, color: 'var(--accent)' },
                      ].map(({ icon, label, value, color }) => (
                        <div key={label} style={{ textAlign: 'center' }}>
                          <i className={`fas ${icon}`} style={{ color, fontSize: '1.1rem', marginBottom: 4, display: 'block' }}></i>
                          <div style={{ fontWeight: 700 }}>{value}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 4 }}>До след. уровня: {userProgress.level_progress_pct}%</div>
                    <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${userProgress.level_progress_pct}%`, background: 'var(--accent)', borderRadius: 3 }} />
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', padding: 12, marginBottom: 20, textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }}></i>Загрузка прогресса...
                  </div>
                )}

                {msg && (
                  <div style={{ padding: '9px 14px', borderRadius: 8, marginBottom: 14, fontSize: '0.85rem',
                    background: msgType === 'success' ? '#66bb6a22' : '#ef535022',
                    color: msgType === 'success' ? '#66bb6a' : '#ef5350',
                    border: `1px solid ${msgType === 'success' ? '#66bb6a44' : '#ef535044'}`,
                  }}>
                    <i className={`fas ${msgType === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`} style={{ marginRight: 6 }}></i>
                    {msg}
                  </div>
                )}

                {/* Set Ecoins */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 5 }}>
                    <i className="fas fa-coins" style={{ marginRight: 5, color: '#ffb300' }}></i>
                    Установить Ecoins
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="number" min="0" placeholder="Кол-во Ecoins" value={ecoins}
                      onChange={e => setEcoins(e.target.value)} style={{ ...inp, flex: 1 }} />
                    <button onClick={saveEcoins} disabled={loading || ecoins === ''}
                      style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.86rem', whiteSpace: 'nowrap' }}>
                      <i className="fas fa-save"></i>
                    </button>
                  </div>
                </div>

                {/* Set Level */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 5 }}>
                    <i className="fas fa-star" style={{ marginRight: 5, color: '#ffb300' }}></i>
                    Установить уровень
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="number" min="1" placeholder="Номер уровня" value={level}
                      onChange={e => setLevel(e.target.value)} style={{ ...inp, flex: 1 }} />
                    <button onClick={saveLevel} disabled={loading || level === ''}
                      style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.86rem' }}>
                      <i className="fas fa-save"></i>
                    </button>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', gap: 8 }}>
                  <a href="/admin/quests" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', textDecoration: 'none', fontSize: '0.82rem' }}>
                    <i className="fas fa-scroll"></i> Квесты
                  </a>
                  <a href="/admin/shop" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', textDecoration: 'none', fontSize: '0.82rem' }}>
                    <i className="fas fa-store"></i> Магазин
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
