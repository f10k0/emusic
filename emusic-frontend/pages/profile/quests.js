import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import useRequireAuth from '../../hooks/useRequireAuth';
import { useRouter } from 'next/router';

const RARITY_LABEL = { common: 'Обычный', rare: 'Редкий', epic: 'Эпический', legendary: 'Легендарный' };
const RARITY_COLOR = { common: '#aaa', rare: '#4fc3f7', epic: '#ab47bc', legendary: '#ffb300' };
const DIFF_COLOR   = { easy: '#66bb6a', medium: '#ffa726', hard: '#ef5350' };
const DIFF_LABEL   = { easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный' };

const TYPE_ICON = {
  avatar_frame:   'fa-id-card',
  bg:             'fa-image',
  theme:          'fa-palette',
  nickname_color: 'fa-font',
  badge:          'fa-certificate',
};

const TYPE_LABEL = {
  avatar_frame:   'Рамка аватара',
  bg:             'Фон профиля',
  theme:          'Тема сайта',
  nickname_color: 'Цвет ника',
  badge:          'Значок',
};

export default function QuestsPage() {
  const { user, ready } = useRequireAuth();
  const router = useRouter();

  const [tab, setTab] = useState('quests');
  const [progress, setProgress] = useState(null);
  const [quests, setQuests] = useState([]);
  const [shopItems, setShopItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [equipped, setEquipped] = useState({});
  const [shopFilter, setShopFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !user) return;
    loadAll();
  }, [ready, user?.id]);

  async function loadAll() {
    setLoading(true);
    try {
      const [prog, q, shop, inv, eq] = await Promise.all([
        api.get('/gamification/progress').then(r => r.data),
        api.get('/gamification/quests/daily').then(r => r.data),
        api.get('/gamification/shop').then(r => r.data),
        api.get('/gamification/inventory').then(r => r.data),
        api.get('/gamification/equipped').then(r => r.data),
      ]);
      setProgress(prog);
      setQuests(q);
      setShopItems(shop);
      setInventory(inv);
      setEquipped(eq);
    } catch {}
    setLoading(false);
  }

  async function claimQuest(dqId) {
    try {
      const { data } = await api.post(`/gamification/quests/${dqId}/claim`);
      setProgress(p => ({ ...p, ecoins: data.total_ecoins }));
      setQuests(prev => prev.map(q => q.id === dqId ? { ...q, claimed: true } : q));
    } catch (e) { alert(e?.response?.data?.detail || 'Ошибка'); }
  }

  async function buyItem(itemId) {
    if (!confirm('Купить предмет?')) return;
    try {
      const { data } = await api.post(`/gamification/shop/${itemId}/buy`);
      setProgress(p => ({ ...p, ecoins: data.remaining_ecoins }));
      loadAll();
    } catch (e) { alert(e?.response?.data?.detail || 'Ошибка'); }
  }

  async function equipItem(invId) {
    try {
      const { data } = await api.post(`/gamification/inventory/${invId}/equip`);
      setEquipped(prev => ({ ...prev, [data.item_type]: data.value }));
      setInventory(prev => prev.map(i => {
        if (i.item_type === data.item_type) return { ...i, is_equipped: i.id === invId };
        return i;
      }));
      // Apply theme immediately if it's a theme item
      if (data.item_type === 'theme' && data.value) {
        document.documentElement.setAttribute('data-theme', data.value);
        localStorage.setItem('emusic_equipped_theme', data.value);
      }
    } catch {}
  }

  async function unequipItem(invId) {
    try {
      const inv = inventory.find(i => i.id === invId);
      await api.post(`/gamification/inventory/${invId}/unequip`);
      setEquipped(prev => { const n = { ...prev }; delete n[inv?.item_type]; return n; });
      setInventory(prev => prev.map(i => i.id === invId ? { ...i, is_equipped: false } : i));
      // Restore default theme if theme item was unequipped
      if (inv?.item_type === 'theme') {
        localStorage.removeItem('emusic_equipped_theme');
        const userTheme = localStorage.getItem('emusic_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', userTheme);
      }
    } catch {}
  }

  const shopTypes = ['all', ...new Set(shopItems.map(i => i.item_type))];
  const filteredShop = shopFilter === 'all' ? shopItems : shopItems.filter(i => i.item_type === shopFilter);

  if (!ready || loading) return <Layout><div className="page-loading">Загрузка...</div></Layout>;

  return (
    <Layout>
      <div className="quests-page">

        {/* Level bar */}
        {progress && (
          <div className="level-card">
            <div className="level-header">
              <div className="level-badge-wrap">
                <i className="fas fa-star" style={{ marginRight: 6, color: '#ffb300' }}></i>
                <span className="level-num">Уровень {progress.level}</span>
              </div>
              <div className="level-coins">
                <i className="fas fa-coins" style={{ marginRight: 5, color: '#ffb300' }}></i>
                <strong>{progress.ecoins}</strong> Ecoins
                <span className="level-sep">·</span>
                <i className="fas fa-headphones" style={{ marginRight: 5, color: 'var(--text-secondary)' }}></i>
                {progress.total_listen_hours} ч.
              </div>
            </div>
            <div className="level-progress-wrap">
              <div className="level-progress-bar" style={{ width: `${progress.level_progress_pct}%` }} />
            </div>
            <div className="level-progress-label">
              До следующего уровня: {Math.ceil((progress.seconds_to_next_level || 0) / 3600)} ч. ({progress.level_progress_pct}%)
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="quests-tabs">
          {[
            ['quests',    'fa-scroll',      'Квесты'],
            ['shop',      'fa-store',       'Магазин'],
            ['inventory', 'fa-box-open',    'Инвентарь'],
          ].map(([key, icon, label]) => (
            <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
              <i className={`fas ${icon}`} style={{ marginRight: 6 }}></i>{label}
            </button>
          ))}
        </div>

        {/* QUESTS */}
        {tab === 'quests' && (
          <div>
            <p className="quests-hint">
              <i className="fas fa-info-circle" style={{ marginRight: 6, color: 'var(--accent)' }}></i>
              Каждый день вам выдаётся 3 случайных квеста. За выполнение вы получаете Ecoins.
            </p>
            {quests.length === 0 && (
              <div className="empty-state">
                <i className="fas fa-scroll" style={{ fontSize: '2rem', marginBottom: 12, opacity: 0.4 }}></i>
                <p>Квесты не найдены. Попробуйте позже.</p>
              </div>
            )}
            <div className="quests-list">
              {quests.map(q => (
                <div key={q.id} className={`quest-card ${q.completed ? 'completed' : ''} ${q.claimed ? 'claimed' : ''}`}>
                  <div className="quest-header">
                    <span className="quest-title">{q.title}</span>
                    <span className="quest-diff" style={{ color: DIFF_COLOR[q.difficulty], background: DIFF_COLOR[q.difficulty] + '22' }}>
                      {DIFF_LABEL[q.difficulty]}
                    </span>
                  </div>
                  <p className="quest-desc">{q.description}</p>
                  <div className="quest-footer">
                    <div className="quest-progress-wrap">
                      <div className="quest-progress-bar" style={{ width: `${Math.min(100, q.progress / q.target_value * 100)}%` }} />
                    </div>
                    <span className="quest-progress-text">{q.progress} / {q.target_value}</span>
                    <span className="quest-reward">
                      <i className="fas fa-coins" style={{ marginRight: 3, color: '#ffb300' }}></i>
                      +{q.ecoin_reward}
                    </span>
                    {q.completed && !q.claimed && (
                      <button className="btn-accent" onClick={() => claimQuest(q.id)}>
                        <i className="fas fa-gift" style={{ marginRight: 5 }}></i>Получить
                      </button>
                    )}
                    {q.claimed && (
                      <span className="quest-done-badge">
                        <i className="fas fa-check-circle" style={{ marginRight: 4 }}></i>Получено
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SHOP */}
        {tab === 'shop' && (
          <div>
            <div className="shop-filters">
              {shopTypes.map(t => (
                <button key={t} className={`filter-btn ${shopFilter === t ? 'active' : ''}`} onClick={() => setShopFilter(t)}>
                  {t === 'all' ? 'Все' : (
                    <><i className={`fas ${TYPE_ICON[t] || 'fa-tag'}`} style={{ marginRight: 5 }}></i>{TYPE_LABEL[t] || t}</>
                  )}
                </button>
              ))}
            </div>
            <div className="shop-grid">
              {filteredShop.map(item => (
                <div key={item.id} className={`shop-card ${item.owned ? 'owned' : ''} ${!item.available ? 'locked' : ''}`}>
                  <div className="shop-item-preview">
                    <i className={`fas ${TYPE_ICON[item.item_type] || 'fa-gift'}`} style={{ fontSize: '2rem', color: RARITY_COLOR[item.rarity] }}></i>
                  </div>
                  <div className="shop-item-info">
                    <div className="shop-item-name">{item.name}</div>
                    <div className="shop-item-type">
                      <i className={`fas ${TYPE_ICON[item.item_type] || 'fa-tag'}`} style={{ marginRight: 4 }}></i>
                      {TYPE_LABEL[item.item_type] || item.item_type}
                    </div>
                    <div className="shop-item-rarity" style={{ color: RARITY_COLOR[item.rarity] }}>
                      {RARITY_LABEL[item.rarity]}
                    </div>
                    <div className="shop-item-desc">{item.description}</div>
                    {!item.available && (
                      <div className="shop-locked-label">
                        <i className="fas fa-lock" style={{ marginRight: 4 }}></i>
                        Откроется на {item.unlock_level} уровне
                      </div>
                    )}
                  </div>
                  <div className="shop-item-footer">
                    <span className="shop-price">
                      <i className="fas fa-coins" style={{ marginRight: 4, color: '#ffb300' }}></i>
                      {item.price}
                    </span>
                    {item.owned ? (
                      <span className="shop-owned-badge">
                        <i className="fas fa-check" style={{ marginRight: 4 }}></i>Куплено
                      </span>
                    ) : item.available ? (
                      <button
                        className="btn-accent"
                        onClick={() => buyItem(item.id)}
                        disabled={progress?.ecoins < item.price}
                        title={progress?.ecoins < item.price ? 'Недостаточно Ecoins' : ''}
                      >
                        Купить
                      </button>
                    ) : (
                      <button className="btn-accent" disabled>
                        <i className="fas fa-lock"></i>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INVENTORY */}
        {tab === 'inventory' && (
          <div>
            {inventory.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-box-open" style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.35 }}></i>
                <p>У вас пока нет предметов. Купите их в магазине!</p>
              </div>
            ) : (
              <div className="shop-grid">
                {inventory.map(inv => (
                  <div key={inv.id} className={`shop-card ${inv.is_equipped ? 'equipped' : ''}`}>
                    <div className="shop-item-preview">
                      <i className={`fas ${TYPE_ICON[inv.item_type] || 'fa-gift'}`} style={{ fontSize: '2rem', color: RARITY_COLOR[inv.rarity] }}></i>
                      {inv.is_equipped && (
                        <div className="equipped-badge">
                          <i className="fas fa-check" style={{ marginRight: 3 }}></i>Надето
                        </div>
                      )}
                    </div>
                    <div className="shop-item-info">
                      <div className="shop-item-name">{inv.name}</div>
                      <div className="shop-item-type">
                        <i className={`fas ${TYPE_ICON[inv.item_type] || 'fa-tag'}`} style={{ marginRight: 4 }}></i>
                        {TYPE_LABEL[inv.item_type] || inv.item_type}
                      </div>
                      <div className="shop-item-rarity" style={{ color: RARITY_COLOR[inv.rarity] }}>
                        {RARITY_LABEL[inv.rarity]}
                      </div>
                    </div>
                    <div className="shop-item-footer">
                      {inv.is_equipped ? (
                        <button className="btn-secondary" onClick={() => unequipItem(inv.id)}>
                          <i className="fas fa-minus-circle" style={{ marginRight: 5 }}></i>Снять
                        </button>
                      ) : (
                        <button className="btn-accent" onClick={() => equipItem(inv.id)}>
                          <i className="fas fa-check-circle" style={{ marginRight: 5 }}></i>Надеть
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .quests-page { max-width: 960px; margin: 0 auto; padding: 24px 16px; }

        .level-card {
          background: var(--bg-secondary); border-radius: 14px; padding: 18px 22px;
          margin-bottom: 24px; border: 1px solid var(--border);
        }
        .level-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
        .level-badge-wrap { display: flex; align-items: center; }
        .level-num { font-size: 1.1rem; font-weight: 700; }
        .level-coins { font-size: 0.88rem; color: var(--text-secondary); display: flex; align-items: center; gap: 6px; }
        .level-sep { opacity: 0.4; }
        .level-progress-wrap { height: 10px; background: var(--border); border-radius: 5px; overflow: hidden; margin-bottom: 6px; }
        .level-progress-bar { height: 100%; background: var(--accent); border-radius: 5px; transition: width 0.5s; }
        .level-progress-label { font-size: 0.78rem; color: var(--text-secondary); }

        .quests-tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
        .tab-btn {
          padding: 8px 18px; border-radius: 20px; border: 1px solid var(--border);
          background: var(--bg-secondary); color: var(--text); cursor: pointer; font-size: 0.88rem;
          transition: all 0.15s; -webkit-text-fill-color: var(--text);
          background-clip: unset !important; -webkit-background-clip: unset !important;
        }
        .tab-btn:hover, .tab-btn.active {
          background: var(--accent); border-color: var(--accent); color: white !important; font-weight: 600;
          -webkit-text-fill-color: white !important; background-clip: unset !important; -webkit-background-clip: unset !important;
        }

        .quests-hint { color: var(--text-secondary); font-size: 0.88rem; margin-bottom: 16px; }
        .quests-list { display: flex; flex-direction: column; gap: 12px; }
        .quest-card {
          background: var(--bg-secondary); border: 1px solid var(--border);
          border-radius: 12px; padding: 16px 18px; transition: border-color 0.2s;
        }
        .quest-card.completed { border-color: #66bb6a55; }
        .quest-card.claimed { opacity: 0.6; }
        .quest-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; gap: 8px; }
        .quest-title { font-weight: 600; font-size: 0.95rem; }
        .quest-diff { font-size: 0.75rem; padding: 2px 9px; border-radius: 20px; font-weight: 600; white-space: nowrap; }
        .quest-desc { font-size: 0.84rem; color: var(--text-secondary); margin: 0 0 12px; }
        .quest-footer { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .quest-progress-wrap { flex: 1; min-width: 80px; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
        .quest-progress-bar { height: 100%; background: var(--accent); border-radius: 3px; transition: width 0.3s; }
        .quest-progress-text { font-size: 0.78rem; color: var(--text-secondary); white-space: nowrap; }
        .quest-reward { font-size: 0.82rem; color: #ffb300; font-weight: 600; white-space: nowrap; }
        .quest-done-badge { font-size: 0.82rem; color: #66bb6a; display: flex; align-items: center; }

        .btn-accent {
          padding: 6px 14px; border-radius: 20px; background: var(--accent);
          color: white; border: none; cursor: pointer; font-size: 0.82rem; font-weight: 600;
          transition: opacity 0.15s; display: inline-flex; align-items: center;
        }
        .btn-accent:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-secondary {
          padding: 6px 14px; border-radius: 20px; background: var(--bg);
          color: var(--text); border: 1px solid var(--border); cursor: pointer;
          font-size: 0.82rem; transition: all 0.15s; display: inline-flex; align-items: center;
        }
        .btn-secondary:hover { border-color: var(--accent); color: var(--accent); }

        .shop-filters { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
        .filter-btn {
          padding: 5px 12px; border-radius: 20px; border: 1px solid var(--border);
          background: var(--bg-secondary); color: var(--text); cursor: pointer; font-size: 0.82rem;
          transition: all 0.15s; display: inline-flex; align-items: center;
        }
        .filter-btn:hover, .filter-btn.active {
          background: var(--accent); border-color: var(--accent); color: white;
        }
        .shop-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; }
        .shop-card {
          background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 14px;
          overflow: hidden; display: flex; flex-direction: column; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .shop-card:hover { border-color: var(--accent); }
        .shop-card.owned { border-color: #66bb6a55; }
        .shop-card.equipped { border-color: var(--accent); box-shadow: 0 0 12px rgba(136,51,255,0.2); }
        .shop-card.locked { opacity: 0.55; }
        .shop-item-preview {
          height: 90px; display: flex; align-items: center; justify-content: center;
          position: relative; background: var(--bg);
        }
        .equipped-badge {
          position: absolute; bottom: 4px; right: 4px; background: var(--accent);
          color: white; font-size: 0.65rem; padding: 2px 8px; border-radius: 10px; font-weight: 600;
          display: flex; align-items: center;
        }
        .shop-item-info { padding: 10px 12px; flex: 1; }
        .shop-item-name { font-weight: 600; font-size: 0.9rem; margin-bottom: 2px; }
        .shop-item-type { font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 3px; display: flex; align-items: center; }
        .shop-item-rarity { font-size: 0.75rem; font-weight: 600; margin-bottom: 5px; }
        .shop-item-desc { font-size: 0.75rem; color: var(--text-secondary); }
        .shop-locked-label { font-size: 0.72rem; color: #ef5350; margin-top: 5px; display: flex; align-items: center; }
        .shop-item-footer {
          padding: 8px 12px; display: flex; align-items: center;
          justify-content: space-between; border-top: 1px solid var(--border);
        }
        .shop-price { font-size: 0.85rem; color: #ffb300; font-weight: 600; display: flex; align-items: center; }
        .shop-owned-badge { font-size: 0.78rem; color: #66bb6a; font-weight: 600; display: flex; align-items: center; }
        .empty-state { text-align: center; color: var(--text-secondary); padding: 60px 0; display: flex; flex-direction: column; align-items: center; }
      `}</style>
    </Layout>
  );
}
