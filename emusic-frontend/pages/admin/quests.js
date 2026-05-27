import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import { useRouter } from 'next/router';

const DIFF_COLOR = { easy: '#66bb6a', medium: '#ffa726', hard: '#ef5350' };
const DIFF_LABEL = { easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный' };

const QUEST_TYPES = [
  'listen_tracks', 'listen_minutes', 'listen_genre', 'listen_genres',
  'listen_all_genres', 'listen_artist', 'like_tracks', 'add_playlist',
  'playlist_tracks', 'buy_items', 'complete_quests', 'listen_album',
  'listen_chart', 'listen_morning', 'listen_night', 'listen_all_day',
  'listen_days', 'listen_new_artists',
];

export default function AdminQuests() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editQuest, setEditQuest] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', quest_type: 'listen_tracks', target_value: 1, ecoin_reward: 10, difficulty: 'easy', target_ref: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [filterDiff, setFilterDiff] = useState('all');
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') { router.push('/'); return; }
    loadQuests();
  }, [user]);

  async function loadQuests() {
    setLoading(true);
    try {
      const { data } = await api.get('/gamification/admin/quests');
      setQuests(data);
    } catch {}
    setLoading(false);
  }

  async function handleSeed(reseed = false) {
    const msg = reseed
      ? 'Это удалит ВСЕ квесты и создаст стандартные 50. Продолжить?'
      : 'Создать стандартные 50 квестов (если их нет)?';
    if (!confirm(msg)) return;
    setSeeding(true);
    try {
      const endpoint = reseed ? '/gamification/admin/reseed' : '/gamification/admin/seed';
      const { data } = await api.post(endpoint);
      alert(`Готово! Квестов: ${data.quests}`);
      await loadQuests();
    } catch (e) {
      alert(e?.response?.data?.detail || 'Ошибка');
    }
    setSeeding(false);
  }

  function openCreate() {
    setEditQuest(null);
    setForm({ title: '', description: '', quest_type: 'listen_tracks', target_value: 1, ecoin_reward: 10, difficulty: 'easy', target_ref: '' });
    setShowForm(true);
  }

  function openEdit(q) {
    setEditQuest(q);
    setForm({ title: q.title, description: q.description, quest_type: q.quest_type, target_value: q.target_value, ecoin_reward: q.ecoin_reward, difficulty: q.difficulty, target_ref: q.target_ref || '' });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.description.trim()) { setMsg('Заполните название и описание'); return; }
    setSaving(true);
    setMsg('');
    try {
      if (editQuest) {
        await api.put(`/gamification/admin/quests/${editQuest.id}`, null, { params: {
          title: form.title, description: form.description, ecoin_reward: form.ecoin_reward,
          difficulty: form.difficulty, target_value: form.target_value,
        }});
      } else {
        await api.post('/gamification/admin/quests', null, { params: {
          title: form.title, description: form.description, quest_type: form.quest_type,
          target_value: form.target_value, ecoin_reward: form.ecoin_reward,
          difficulty: form.difficulty, target_ref: form.target_ref || undefined,
        }});
      }
      await loadQuests();
      setShowForm(false);
    } catch (e) {
      setMsg(e?.response?.data?.detail || 'Ошибка сохранения');
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Удалить квест?')) return;
    try {
      await api.delete(`/gamification/admin/quests/${id}`);
      setQuests(prev => prev.filter(q => q.id !== id));
    } catch {}
  }

  const filtered = filterDiff === 'all' ? quests : quests.filter(q => q.difficulty === filterDiff);

  if (loading) return <Layout><div className="page-loading">Загрузка...</div></Layout>;

  return (
    <Layout>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-scroll" style={{ color: 'var(--accent)' }}></i>
            Управление квестами
          </h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => handleSeed(false)} disabled={seeding}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)', cursor: 'pointer', fontSize: '0.86rem' }}>
              <i className="fas fa-seedling"></i> Стандартные 50 квестов
            </button>
            <button onClick={openCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              <i className="fas fa-plus"></i> Создать квест
            </button>
          </div>
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {['all', 'easy', 'medium', 'hard'].map(d => (
            <button key={d} onClick={() => setFilterDiff(d)}
              style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid var(--border)', background: filterDiff === d ? 'var(--accent)' : 'var(--bg-secondary)', color: filterDiff === d ? 'white' : 'var(--text)', cursor: 'pointer', fontSize: '0.84rem' }}>
              {d === 'all' ? 'Все' : DIFF_LABEL[d]}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: '0.85rem', alignSelf: 'center' }}>
            {filtered.length} из {quests.length} квестов
          </span>
        </div>

        {/* Quest list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(q => (
            <div key={q.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600 }}>{q.title}</span>
                  <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: 10, background: DIFF_COLOR[q.difficulty] + '22', color: DIFF_COLOR[q.difficulty], fontWeight: 600 }}>
                    {DIFF_LABEL[q.difficulty]}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', background: 'var(--bg)', padding: '1px 8px', borderRadius: 10, border: '1px solid var(--border)' }}>
                    {q.quest_type}
                  </span>
                </div>
                <p style={{ margin: '0 0 6px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>{q.description}</p>
                <div style={{ display: 'flex', gap: 14, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <span><i className="fas fa-bullseye" style={{ marginRight: 4, color: 'var(--accent)' }}></i>Цель: {q.target_value}</span>
                  <span><i className="fas fa-coins" style={{ marginRight: 4, color: '#ffb300' }}></i>Награда: {q.ecoin_reward} Ecoins</span>
                  {q.target_ref && <span><i className="fas fa-tag" style={{ marginRight: 4 }}></i>{q.target_ref}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => openEdit(q)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '0.82rem' }}>
                  <i className="fas fa-edit"></i>
                </button>
                <button onClick={() => handleDelete(q.id)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ef535033', background: '#ef535011', color: '#ef5350', cursor: 'pointer', fontSize: '0.82rem' }}>
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 540, padding: 24, margin: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0 }}>
                  <i className={`fas ${editQuest ? 'fa-edit' : 'fa-plus-circle'}`} style={{ marginRight: 8, color: 'var(--accent)' }}></i>
                  {editQuest ? 'Редактировать квест' : 'Создать квест'}
                </h3>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {msg && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, background: '#ef535022', color: '#ef5350', border: '1px solid #ef535044', fontSize: '0.88rem' }}>{msg}</div>}

              {[
                { label: 'Название', field: 'title', type: 'text' },
                { label: 'Описание', field: 'description', type: 'text' },
              ].map(({ label, field, type }) => (
                <div key={field} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 5 }}>{label}</label>
                  <input type={type} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
              ))}

              {!editQuest && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 5 }}>Тип квеста</label>
                  <select value={form.quest_type} onChange={e => setForm(f => ({ ...f, quest_type: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.9rem' }}>
                    {QUEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 5 }}>Цель (target_value)</label>
                  <input type="number" min="1" value={form.target_value} onChange={e => setForm(f => ({ ...f, target_value: parseInt(e.target.value) || 1 }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 5 }}>Награда (Ecoins)</label>
                  <input type="number" min="1" value={form.ecoin_reward} onChange={e => setForm(f => ({ ...f, ecoin_reward: parseInt(e.target.value) || 1 }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 5 }}>Сложность</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['easy', 'medium', 'hard'].map(d => (
                    <button key={d} onClick={() => setForm(f => ({ ...f, difficulty: d }))}
                      style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `1px solid ${form.difficulty === d ? DIFF_COLOR[d] : 'var(--border)'}`, background: form.difficulty === d ? DIFF_COLOR[d] + '22' : 'var(--bg)', color: form.difficulty === d ? DIFF_COLOR[d] : 'var(--text)', cursor: 'pointer', fontSize: '0.84rem', fontWeight: form.difficulty === d ? 700 : 400 }}>
                      {DIFF_LABEL[d]}
                    </button>
                  ))}
                </div>
              </div>

              {!editQuest && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 5 }}>Цель-ссылка (опционально, напр. rock / pop)</label>
                  <input type="text" value={form.target_ref} onChange={e => setForm(f => ({ ...f, target_ref: e.target.value }))}
                    placeholder="genre slug, artist_id и т.д."
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleSave} disabled={saving}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                  {saving ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }}></i>Сохранение...</> : 'Сохранить'}
                </button>
                <button onClick={() => setShowForm(false)} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '0.9rem' }}>
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
