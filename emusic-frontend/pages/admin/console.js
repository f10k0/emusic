import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function AdminConsole() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [commandLogs, setCommandLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Состояния для команд
  const [command, setCommand] = useState('');
  const [commandResult, setCommandResult] = useState(null);
  const [executing, setExecuting] = useState(false);
  
  // Данные для пользователей
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [banningUserId, setBanningUserId] = useState(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [statsRes, logsRes, cmdLogsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/logs'),
        api.get('/admin/command-logs')
      ]);
      setStats(statsRes.data);
      setLogs(logsRes.data.logs || []);
      setCommandLogs(cmdLogsRes.data.logs || []);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data || []);
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleBanUser = async (userId, username, currentStatus) => {
    if (!confirm(`Вы уверены, что хотите ${currentStatus ? 'разбанить' : 'забанить'} пользователя ${username}?`)) {
      return;
    }
    
    setBanningUserId(userId);
    try {
      // Используем команду для бана/разбана
      const res = await api.post('/admin/command', { 
        command: 'toggle-ban', 
        args: userId.toString() 
      });
      alert(res.data.message);
      fetchUsers(); // Обновляем список
      fetchData(); // Обновляем статистику
    } catch (err) {
      console.error('Ошибка:', err);
      alert('Не удалось изменить статус пользователя');
    } finally {
      setBanningUserId(null);
    }
  };

  const executeCommand = async () => {
    if (!command.trim()) return;
    
    setExecuting(true);
    setCommandResult(null);
    
    try {
      const parts = command.trim().split(' ');
      const cmd = parts[0];
      const args = parts.slice(1).join(' ');
      
      const res = await api.post('/admin/command', { command: cmd, args });
      setCommandResult(res.data);
      
      // Обновляем логи команд
      const cmdLogsRes = await api.get('/admin/command-logs');
      setCommandLogs(cmdLogsRes.data.logs || []);
      
      // Обновляем данные в зависимости от команды
      if (['delete-track', 'toggle-ban', 'delete-user'].includes(cmd)) {
        fetchData();
        if (cmd === 'toggle-ban' || cmd === 'delete-user') {
          fetchUsers();
        }
      }
    } catch (err) {
      setCommandResult({
        message: 'Ошибка выполнения команды',
        error: err.response?.data?.detail || err.message
      });
    } finally {
      setExecuting(false);
      setCommand('');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const getActionColor = (action) => {
    switch(action) {
      case 'Одобрение': return '#28a745';
      case 'Отклонение': return '#ffc107';
      case 'Удаление': return '#dc3545';
      case 'Бан': return '#dc3545';
      case 'Разбан': return '#28a745';
      default: return 'var(--text-secondary)';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="admin">
        <Layout>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: 'var(--accent)' }}></i>
            <p style={{ marginTop: '16px' }}>Загрузка консоли...</p>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <Layout>
        <div className="profile-container">
          <h2>Админ-консоль</h2>
          
          <div className="tabs" style={{ marginBottom: '30px' }}>
            <button 
              className={activeTab === 'stats' ? 'active' : ''} 
              onClick={() => setActiveTab('stats')}
            >
              Статистика
            </button>
            <button 
              className={activeTab === 'users' ? 'active' : ''} 
              onClick={() => { setActiveTab('users'); fetchUsers(); }}
            >
              Пользователи
            </button>
            <button 
              className={activeTab === 'commands' ? 'active' : ''} 
              onClick={() => setActiveTab('commands')}
            >
              Команды
            </button>
            <button 
              className={activeTab === 'logs' ? 'active' : ''} 
              onClick={() => setActiveTab('logs')}
            >
              Логи действий
            </button>
            <button 
              className={activeTab === 'cmdlogs' ? 'active' : ''} 
              onClick={() => setActiveTab('cmdlogs')}
            >
              История команд
            </button>
          </div>

          {activeTab === 'stats' && (
            <div>
              <div className="stats-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
              }}>
                <div className="stat-card" style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '16px' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Всего пользователей</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent)' }}>{stats?.total_users || 0}</div>
                </div>
                <div className="stat-card" style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '16px' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Всего артистов</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent-light)' }}>{stats?.total_artists || 0}</div>
                </div>
                <div className="stat-card" style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '16px' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Всего треков</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#28a745' }}>{stats?.total_tracks || 0}</div>
                </div>
                <div className="stat-card" style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '16px' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Опубликовано</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#28a745' }}>{stats?.published_tracks || 0}</div>
                </div>
                <div className="stat-card" style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '16px' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>На модерации</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ffc107' }}>{stats?.pending_submissions || 0}</div>
                </div>
                <div className="stat-card" style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '16px' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Всего прослушиваний</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#17a2b8' }}>{stats?.total_play_count?.toLocaleString() || 0}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <div style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '16px' }}>
                  <h3 style={{ marginBottom: '15px' }}>Активность за 24 часа</h3>
                  <p>Новых пользователей: <strong>{stats?.new_users_24h || 0}</strong></p>
                  <p>Новых треков: <strong>{stats?.new_tracks_24h || 0}</strong></p>
                </div>
                <div style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '16px' }}>
                  <h3 style={{ marginBottom: '15px' }}>Распределение ролей</h3>
                  <p>Администраторы: <strong>{stats?.admins_count || 0}</strong></p>
                  <p>Обычные пользователи: <strong>{stats?.users_count || 0}</strong></p>
                  <p>Артисты: <strong>{stats?.total_artists || 0}</strong></p>
                </div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '16px' }}>
                <h3 style={{ marginBottom: '15px' }}>Топ треков</h3>
                <div className="track-list">
                  {stats?.top_tracks?.map(track => (
                    <div key={track.id} className="track-item" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <div>
                        <strong>{track.title}</strong> — {track.artist}
                      </div>
                      <div style={{ color: 'var(--accent-light)' }}>
                        <i className="fas fa-headphones"></i> {track.plays}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <div style={{ 
                background: 'var(--bg-elevated)', 
                borderRadius: '16px', 
                border: '1px solid var(--border)',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  padding: '15px 20px', 
                  background: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h3 style={{ margin: 0 }}>Управление пользователями</h3>
                  <button 
                    className="btn-secondary" 
                    onClick={fetchUsers}
                    disabled={usersLoading}
                    style={{ padding: '5px 15px', fontSize: '0.9rem' }}
                  >
                    {usersLoading ? <i className="fas fa-spinner fa-spin"></i> : 'Обновить'}
                  </button>
                </div>

                {usersLoading ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: 'var(--accent)' }}></i>
                    <p style={{ marginTop: '10px' }}>Загрузка пользователей...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <i className="fas fa-users" style={{ fontSize: '48px', marginBottom: '10px' }}></i>
                    <p>Нет пользователей для отображения</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
                          <th style={{ padding: '12px 15px', textAlign: 'left' }}>ID</th>
                          <th style={{ padding: '12px 15px', textAlign: 'left' }}>Имя пользователя</th>
                          <th style={{ padding: '12px 15px', textAlign: 'left' }}>Email</th>
                          <th style={{ padding: '12px 15px', textAlign: 'left' }}>Роль</th>
                          <th style={{ padding: '12px 15px', textAlign: 'left' }}>Статус</th>
                          <th style={{ padding: '12px 15px', textAlign: 'left' }}>Дата регистрации</th>
                          <th style={{ padding: '12px 15px', textAlign: 'left' }}>Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(userItem => (
                          <tr key={userItem.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px 15px' }}>{userItem.id}</td>
                            <td style={{ padding: '12px 15px', fontWeight: '600' }}>{userItem.username}</td>
                            <td style={{ padding: '12px 15px' }}>{userItem.email}</td>
                            <td style={{ padding: '12px 15px' }}>
                              <span style={{
                                background: userItem.role === 'admin' ? 'rgba(220, 53, 69, 0.1)' : 
                                          userItem.role === 'artist' ? 'rgba(136, 51, 255, 0.1)' : 
                                          'rgba(40, 167, 69, 0.1)',
                                color: userItem.role === 'admin' ? '#dc3545' : 
                                       userItem.role === 'artist' ? 'var(--accent)' : 
                                       '#28a745',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '0.8rem',
                                fontWeight: '600'
                              }}>
                                {userItem.role === 'admin' ? 'Админ' : 
                                 userItem.role === 'artist' ? 'Артист' : 'Пользователь'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 15px' }}>
                              <span style={{
                                background: userItem.is_active ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)',
                                color: userItem.is_active ? '#28a745' : '#dc3545',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '0.8rem',
                                fontWeight: '600'
                              }}>
                                {userItem.is_active ? 'Активен' : 'Забанен'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 15px' }}>{formatDate(userItem.created)}</td>
                            <td style={{ padding: '12px 15px' }}>
                              <button
                                onClick={() => handleBanUser(userItem.id, userItem.username, userItem.is_active)}
                                disabled={banningUserId === userItem.id || userItem.role === 'admin'}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: userItem.is_active ? '#ff6b6b' : '#28a745',
                                  cursor: (banningUserId === userItem.id || userItem.role === 'admin') ? 'not-allowed' : 'pointer',
                                  opacity: (banningUserId === userItem.id || userItem.role === 'admin') ? 0.5 : 1,
                                  fontSize: '1rem',
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  if (!banningUserId && userItem.role !== 'admin') {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'none';
                                }}
                                title={userItem.role === 'admin' ? 'Нельзя забанить администратора' : ''}
                              >
                                {banningUserId === userItem.id ? (
                                  <i className="fas fa-spinner fa-spin"></i>
                                ) : (
                                  <>
                                    <i className={`fas ${userItem.is_active ? 'fa-ban' : 'fa-check-circle'}`}></i>
                                    <span style={{ marginLeft: '5px' }}>
                                      {userItem.is_active ? 'Забанить' : 'Разбанить'}
                                    </span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'commands' && (
            <div>
              {/* Поле ввода команды */}
              <div style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '16px', marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '15px' }}>Консоль команд</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && executeCommand()}
                    placeholder="Введите команду (help для справки)"
                    style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  />
                  <button className="btn" onClick={executeCommand} disabled={executing}>
                    {executing ? '...' : 'Выполнить'}
                  </button>
                </div>
              </div>

              {/* Результат команды */}
              {commandResult && (
                <div style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '16px', marginBottom: '20px' }}>
                  <h4>Результат:</h4>
                  <p style={{ color: commandResult.error ? '#ff6b6b' : '#28a745' }}>
                    {commandResult.message}
                  </p>
                  {commandResult.data && (
                    <pre style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '8px', overflow: 'auto', maxHeight: '300px' }}>
                      {JSON.stringify(commandResult.data, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              {/* Красивый список доступных команд */}
              <div style={{ 
                background: 'var(--bg-elevated)', 
                padding: '20px', 
                borderRadius: '16px',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow)'
              }}>
                <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fas fa-terminal" style={{ color: 'var(--accent)' }}></i>
                  Доступные команды
                </h3>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: '12px'
                }}>
                  {[
                    { cmd: 'help', desc: 'Показать список команд' },
                    { cmd: 'stats', desc: 'Показать полную статистику' },
                    { cmd: 'users', desc: 'Список пользователей' },
                    { cmd: 'artists', desc: 'Список артистов' },
                    { cmd: 'tracks', desc: 'Список треков' },
                    { cmd: 'top [N]', desc: 'Топ N треков (по умолчанию 10)' },
                    { cmd: 'user [id/name]', desc: 'Информация о пользователе' },
                    { cmd: 'toggle-ban [id]', desc: 'Забанить/разбанить пользователя' },
                    { cmd: 'delete-track [id]', desc: 'Удалить трек по ID' },
                    { cmd: 'delete-user [id]', desc: 'Удалить пользователя (осторожно!)' },
                    { cmd: 'clear-logs', desc: 'Очистить логи команд' },
                  ].map((item, index) => (
                    <div
                      key={index}
                      style={{
                        background: 'var(--bg-secondary)',
                        padding: '15px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        transition: 'transform 0.2s, border-color 0.2s',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.borderColor = 'var(--accent)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                      onClick={() => setCommand(item.cmd.split(' ')[0])}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="fas fa-chevron-right" style={{ color: 'var(--accent)', fontSize: '0.8rem' }}></i>
                        <code style={{ 
                          background: 'rgba(136, 51, 255, 0.1)', 
                          padding: '3px 8px', 
                          borderRadius: '6px', 
                          color: 'var(--accent-light)',
                          fontFamily: 'monospace',
                          fontSize: '0.9rem'
                        }}>
                          {item.cmd}
                        </code>
                      </div>
                      <p style={{ 
                        marginTop: '8px', 
                        marginLeft: '18px', 
                        color: 'var(--text-secondary)', 
                        fontSize: '0.9rem',
                        lineHeight: '1.4'
                      }}>
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
                
                <div style={{ 
                  marginTop: '15px', 
                  padding: '10px', 
                  background: 'rgba(136, 51, 255, 0.05)', 
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem'
                }}>
                  <i className="fas fa-info-circle" style={{ color: 'var(--accent)' }}></i>
                  <span>Нажмите на любую команду, чтобы вставить её в поле ввода</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="logs-container" style={{
              background: 'var(--bg-elevated)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              overflow: 'hidden'
            }}>
              {logs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Нет записей в логах
                </div>
              ) : (
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {logs.map(log => (
                    <div key={log.id} style={{
                      padding: '15px 20px',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '20px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ minWidth: '100px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {new Date(log.timestamp).toLocaleTimeString('ru-RU')}
                      </div>
                      <div style={{ minWidth: '100px', color: getActionColor(log.action), fontWeight: '600' }}>
                        {log.action}
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ color: 'var(--accent-light)' }}>{log.admin}</span>
                        <span style={{ color: 'var(--text-secondary)' }}> → </span>
                        <span>{log.details}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'cmdlogs' && (
            <div className="logs-container" style={{
              background: 'var(--bg-elevated)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              overflow: 'hidden'
            }}>
              {commandLogs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Нет записей в истории команд
                </div>
              ) : (
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {commandLogs.map(log => (
                    <div key={log.id} style={{
                      padding: '15px 20px',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '20px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ minWidth: '100px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {new Date(log.timestamp).toLocaleTimeString('ru-RU')}
                      </div>
                      <div style={{ minWidth: '80px', color: 'var(--accent-light)', fontWeight: '600' }}>
                        {log.admin}
                      </div>
                      <div style={{ minWidth: '100px', color: '#ffc107', fontWeight: '600' }}>
                        {log.command}
                      </div>
                      <div style={{ flex: 1 }}>
                        {log.args && <span style={{ color: 'var(--text-secondary)' }}>аргументы: {log.args} → </span>}
                        <span style={{ color: 'var(--text-primary)' }}>{log.result}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}