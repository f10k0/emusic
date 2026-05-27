import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useSettingsStore, { default as settingsStore } from '../../store/settingsStore';
import useAuthStore from '../../store/authStore';
import ProtectedRoute from '../../components/ProtectedRoute';

const TABS = [
  { id: 'general', label: 'Общие', icon: 'fa-sliders-h' },
  { id: 'playback', label: 'Воспроизведение', icon: 'fa-headphones' },
  { id: 'notifications', label: 'Уведомления', icon: 'fa-bell' },
  { id: 'privacy', label: 'Приватность', icon: 'fa-lock' },
  { id: 'advanced', label: 'Дополнительно', icon: 'fa-cog' },
];

const EQ_PRESETS = ['normal', 'bass', 'treble', 'classical', 'rock', 'pop'];
const EQ_LABELS = { normal: 'Нормальный', bass: 'Басы', treble: 'Высокие', classical: 'Классика', rock: 'Рок', pop: 'Поп' };

const DEFAULT = {
  hide_adult: false,
  autoplay: true,
  audio_quality: 'medium',
  theme: 'dark',
  volume_db: 0,
  notifications_new_tracks: true,
  notifications_events: true,
  profile_public: true,
  stats_public: false,
  save_queue: false,
  auto_clear_history: false,
  equalizer_preset: 'normal',
};

function Toggle({ checked, onChange }) {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider"></span>
    </label>
  );
}

export default function SettingsPage() {
  const { user, fetchUser } = useAuthStore();
  const { loadSettings } = useSettingsStore();
  const [settings, setSettings] = useState(DEFAULT);
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get('/users/me/settings').then(r => {
      const s = { ...DEFAULT, ...r.data };
      setSettings(s);
      // Apply theme immediately when loading
      useSettingsStore.getState().applyTheme(s.theme);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const set = (key, val) => {
    setSettings(s => ({ ...s, [key]: val }));
    // Применяем тему мгновенно при изменении
    if (key === 'theme') {
      useSettingsStore.getState().applyTheme(val);
      localStorage.setItem('emusic_theme', val);
    }
  };

  const save = async () => {
    try {
      await api.put('/users/me/settings', settings);
      loadSettings(settings); // Применяем немедленно (тема, EQ, громкость)
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await fetchUser();
    } catch {}
  };

  if (loading) return (
    <ProtectedRoute><Layout>
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
      </div>
    </Layout></ProtectedRoute>
  );

  return (
    <ProtectedRoute>
      <Layout>
        <div style={{ padding: '32px 24px' }}>
          <div className="settings-page">
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 4 }}>
                <i className="fas fa-sliders-h" style={{ color: 'var(--accent)', marginRight: 10 }}></i>
                Настройки
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Персонализируйте платформу под себя</p>
            </div>

            <div className="settings-tabs">
              {TABS.map(t => (
                <button key={t.id} className={`settings-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                  <i className={`fas ${t.icon}`} style={{ marginRight: 6, fontSize: '0.8rem' }}></i>
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'general' && (
              <>
                <div className="settings-group">
                  <div className="settings-item">
                    <div>
                      <div className="settings-item-label"><i className="fas fa-ban" style={{color:"var(--accent)",marginRight:7,fontSize:"0.85rem"}}></i>Скрывать 18+ контент</div>
                      <div className="settings-item-desc">Скрывать треки с пометкой 18+ в поиске и рекомендациях. По умолчанию выключено.</div>
                    </div>
                    <Toggle checked={settings.hide_adult} onChange={v => set('hide_adult', v)} />
                  </div>
                  <div className="settings-item">
                    <div>
                      <div className="settings-item-label"><i className="fas fa-palette" style={{color:"var(--accent)",marginRight:7,fontSize:"0.85rem"}}></i>Тема оформления</div>
                    </div>
                    <select className="settings-select" value={settings.theme} onChange={e => set('theme', e.target.value)}>
                      <option value="dark">Тёмная</option>
                      <option value="light">Светлая</option>
                      <option value="system">Системная</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'playback' && (
              <>
                <div className="settings-group">
                  <div className="settings-item">
                    <div>
                      <div className="settings-item-label"><i className="fas fa-play-circle" style={{color:"var(--accent)",marginRight:7,fontSize:"0.85rem"}}></i>Автовоспроизведение</div>
                      <div className="settings-item-desc">Автоматически начинать воспроизведение при открытии плеера</div>
                    </div>
                    <Toggle checked={settings.autoplay} onChange={v => set('autoplay', v)} />
                  </div>
                  <div className="settings-item">
                    <div>
                      <div className="settings-item-label"><i className="fas fa-sliders-h" style={{color:"var(--accent)",marginRight:7,fontSize:"0.85rem"}}></i>Качество аудио</div>
                    </div>
                    <select className="settings-select" value={settings.audio_quality} onChange={e => set('audio_quality', e.target.value)}>
                      <option value="low">Низкое</option>
                      <option value="medium">Среднее</option>
                      <option value="high">Высокое</option>
                    </select>
                  </div>
                  <div className="settings-item">
                    <div>
                      <div className="settings-item-label"><i className="fas fa-volume-up" style={{color:"var(--accent)",marginRight:7,fontSize:"0.85rem"}}></i>Громкость (dB): {settings.volume_db > 0 ? '+' : ''}{settings.volume_db} dB</div>
                      <div className="settings-item-desc">Нормализация громкости относительно стандартного уровня</div>
                    </div>
                    <input
                      type="range"
                      className="settings-range"
                      min={-12} max={12} step={1}
                      value={settings.volume_db}
                      onChange={e => set('volume_db', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="settings-item">
                    <div>
                      <div className="settings-item-label"><i className="fas fa-wave-square" style={{color:"var(--accent)",marginRight:7,fontSize:"0.85rem"}}></i>Эквалайзер</div>
                    </div>
                    <select className="settings-select" value={settings.equalizer_preset} onChange={e => set('equalizer_preset', e.target.value)}>
                      {EQ_PRESETS.map(p => <option key={p} value={p}>{EQ_LABELS[p]}</option>)}
                    </select>
                  </div>
                </div>
                <div className="settings-group">
                  <div className="settings-item">
                    <div>
                      <div className="settings-item-label"><i className="fas fa-save" style={{color:"var(--accent)",marginRight:7,fontSize:"0.85rem"}}></i>Сохранять очередь после перезагрузки</div>
                      <div className="settings-item-desc">Очередь воспроизведения сохраняется в localStorage</div>
                    </div>
                    <Toggle checked={settings.save_queue} onChange={v => set('save_queue', v)} />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'notifications' && (
              <div className="settings-group">
                <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(136,51,255,0.08)', borderRadius: 12, border: '1px solid rgba(136,51,255,0.2)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <i className="fas fa-info-circle" style={{ color: 'var(--accent)', marginRight: 7 }}></i>
                  Уведомления приходят от артистов, на которых вы подписаны. Управляйте подписками в разделе «Любимые артисты».
                </div>
                <div className="settings-item">
                  <div>
                    <div className="settings-item-label"><i className="fas fa-music" style={{color:"var(--accent)",marginRight:7,fontSize:"0.85rem"}}></i>Новые треки</div>
                    <div className="settings-item-desc">Когда артист из ваших подписок выпускает новый трек</div>
                  </div>
                  <Toggle checked={settings.notifications_new_tracks} onChange={v => set('notifications_new_tracks', v)} />
                </div>
                <div className="settings-item">
                  <div>
                    <div className="settings-item-label"><i className="fas fa-calendar-alt" style={{color:"var(--accent)",marginRight:7,fontSize:"0.85rem"}}></i>Мероприятия</div>
                    <div className="settings-item-desc">Когда артист добавляет новое мероприятие или концерт</div>
                  </div>
                  <Toggle checked={settings.notifications_events} onChange={v => set('notifications_events', v)} />
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="settings-group">
                <div className="settings-item">
                  <div>
                    <div className="settings-item-label"><i className="fas fa-user" style={{color:"var(--accent)",marginRight:7,fontSize:"0.85rem"}}></i>Публичный профиль</div>
                    <div className="settings-item-desc">Другие пользователи могут видеть ваши плейлисты</div>
                  </div>
                  <Toggle checked={settings.profile_public} onChange={v => set('profile_public', v)} />
                </div>
                <div className="settings-item">
                  <div>
                    <div className="settings-item-label"><i className="fas fa-chart-bar" style={{color:"var(--accent)",marginRight:7,fontSize:"0.85rem"}}></i>Публичная статистика</div>
                    <div className="settings-item-desc">Другие пользователи могут видеть вашу статистику прослушиваний</div>
                  </div>
                  <Toggle checked={settings.stats_public} onChange={v => set('stats_public', v)} />
                </div>
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="settings-group">
                <div className="settings-item">
                  <div>
                    <div className="settings-item-label"><i className="fas fa-trash-alt" style={{color:"var(--accent)",marginRight:7,fontSize:"0.85rem"}}></i>Автоочистка истории</div>
                    <div className="settings-item-desc">Автоматически удалять историю прослушиваний раз в месяц</div>
                  </div>
                  <Toggle checked={settings.auto_clear_history} onChange={v => set('auto_clear_history', v)} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 24 }}>
              <button className="btn" style={{ padding: '11px 28px' }} onClick={save}>
                <i className="fas fa-save"></i> Сохранить настройки
              </button>
              {saved && (
                <span style={{ color: '#4caf87', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-check-circle"></i> Сохранено!
                </span>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
