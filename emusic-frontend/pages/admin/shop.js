import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import { useRouter } from 'next/router';

const RARITY_COLOR = { common: '#aaa', rare: '#4fc3f7', epic: '#ab47bc', legendary: '#ffb300' };
const RARITY_LABEL = { common: 'Обычный', rare: 'Редкий', epic: 'Эпический', legendary: 'Легендарный' };
const TYPE_LABEL = { avatar_frame: 'Рамка аватара', bg: 'Фон профиля', theme: 'Тема сайта', nickname_color: 'Цвет ника', badge: 'Значок' };
const TYPE_ICON = { avatar_frame: 'fa-id-card', bg: 'fa-image', theme: 'fa-palette', nickname_color: 'fa-font', badge: 'fa-certificate' };

const ITEM_TYPES = ['avatar_frame', 'bg', 'theme', 'nickname_color', 'badge'];
const RARITIES = ['common', 'rare', 'epic', 'legendary'];

export default function AdminShop() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', item_type: 'avatar_frame', value: '', price: 100, rarity: 'common', unlock_level: 0 });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') { router.push('/'); return; }
    loadItems();
  }, [user]);

  async function loadItems() {
    setLoading(true);
    try {
      const { data } = await api.get('/gamification/admin/shop-items');
      setItems(data);
    } catch {}
    setLoading(false);
  }

  async function handleSeed(reseed = false) {
    const msg = reseed
      ? 'Это удалит ВСЕ предметы магазина и создаст стандартные 15. Продолжить?'
      : 'Создать стандартные предметы магазина (если их нет)?';
    if (!confirm(msg)) return;
    setSeeding(true);
    try {
      const endpoint = reseed ? '/gamification/admin/reseed' : '/gamification/admin/seed';
      const { data } = await api.post(endpoint);
      alert(`Готово! Предметов в магазине: ${data.shop_items}`);
      await loadItems();
    } catch (e) {
      alert(e?.response?.data?.detail || 'Ошибка');
    }
    setSeeding(false);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.value.trim()) { setMsg('Заполните название и значение'); return; }
    setSaving(true);
    setMsg('');
    try {
      await api.post('/gamification/admin/shop-items', null, { params: form });
      await loadItems();
      setShowForm(false);
      setForm({ name: '', description: '', item_type: 'avatar_frame', value: '', price: 100, rarity: 'common', unlock_level: 0 });
    } catch (e) {
      setMsg(e?.response?.data?.detail || 'Ошибка');
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Удалить предмет из магазина?')) return;
    try {
      await api.delete(`/gamification/admin/shop-items/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch {}
  }

  const filtered = filterType === 'all' ? items : items.filter(i => i.item_type === filterType);

  if (loading) return <Layout><div className="page-loading">Загрузка...</div></Layout>;

  return (
    <Layout>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-store" style={{ color: 'var(--accent)' }}></i>
            Управление магазином
          </h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => handleSeed(false)} disabled={seeding}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)', cursor: 'pointer', fontSize: '0.86rem' }}>
              <i className="fas fa-seedling"></i> Стандартные данные
            </button>
            <button onClick={() => handleSeed(true)} disabled={seeding}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid #ef535044', background: '#ef535011', color: '#ef5350', cursor: 'pointer', fontSize: '0.86rem' }}>
              <i className="fas fa-redo"></i> Пересоздать
            </button>
            <button onClick={() => setShowForm(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              <i className="fas fa-plus"></i> Добавить предмет
            </button>
          </div>
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {['all', ...ITEM_TYPES].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid var(--border)', background: filterType === t ? 'var(--accent)' : 'var(--bg-secondary)', color: filterType === t ? 'white' : 'var(--text)', cursor: 'pointer', fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {t !== 'all' && <i className={`fas ${TYPE_ICON[t]}`}></i>}
              {t === 'all' ? 'Все' : TYPE_LABEL[t]}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: '0.85rem', alignSelf: 'center' }}>
            {filtered.length} предметов
          </span>
        </div>

        {/* Items grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {filtered.map(item => (
            <div key={item.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
                <i className={`fas ${TYPE_ICON[item.item_type] || 'fa-gift'}`} style={{ fontSize: '2rem', color: RARITY_COLOR[item.rarity] }}></i>
              </div>
              <div style={{ padding: '10px 12px', flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>{item.name}</div>
                <div style={{ fontSize: '0.74rem', color: RARITY_COLOR[item.rarity], fontWeight: 600, marginBottom: 3 }}>{RARITY_LABEL[item.rarity]}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: 3 }}>
                  <i className={`fas ${TYPE_ICON[item.item_type]}`} style={{ marginRight: 4 }}></i>{TYPE_LABEL[item.item_type]}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Значение: <code style={{ fontSize: '0.7rem' }}>{item.value}</code></div>
                {item.unlock_level > 0 && <div style={{ fontSize: '0.72rem', color: '#ffa726', marginTop: 2 }}>Уровень {item.unlock_level}+</div>}
              </div>
              <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#ffb300', fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <i className="fas fa-coins"></i>{item.price}
                </span>
                <button onClick={() => handleDelete(item.id)}
                  style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #ef535033', background: '#ef535011', color: '#ef5350', cursor: 'pointer', fontSize: '0.8rem' }}>
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Create modal */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 520, padding: 24, margin: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0 }}>
                  <i className="fas fa-plus-circle" style={{ marginRight: 8, color: 'var(--accent)' }}></i>
                  Новый предмет магазина
                </h3>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {msg && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, background: '#ef535022', color: '#ef5350', border: '1px solid #ef535044', fontSize: '0.88rem' }}>{msg}</div>}

              {[
                { label: 'Название', field: 'name' },
                { label: 'Описание', field: 'description' },
                { label: 'Значение (CSS-класс или ключ темы)', field: 'value' },
              ].map(({ label, field }) => (
                <div key={field} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 5 }}>{label}</label>
                  <input type="text" value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 5 }}>Тип предмета</label>
                  <select value={form.item_type} onChange={e => setForm(f => ({ ...f, item_type: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.9rem' }}>
                    {ITEM_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 5 }}>Редкость</label>
                  <select value={form.rarity} onChange={e => setForm(f => ({ ...f, rarity: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.9rem' }}>
                    {RARITIES.map(r => <option key={r} value={r}>{RARITY_LABEL[r]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 5 }}>Цена (Ecoins)</label>
                  <input type="number" min="1" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseInt(e.target.value) || 1 }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 5 }}>Мин. уровень</label>
                  <input type="number" min="0" value={form.unlock_level} onChange={e => setForm(f => ({ ...f, unlock_level: parseInt(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleSave} disabled={saving}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  {saving ? 'Сохранение...' : 'Добавить'}
                </button>
                <button onClick={() => setShowForm(false)} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer' }}>
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
