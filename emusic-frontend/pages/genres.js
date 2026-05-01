import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import Link from 'next/link';

export default function AllGenres() {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchGenres();
  }, []);

  const fetchGenres = async () => {
    try {
      const res = await api.get('/genres');
      setGenres(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredGenres = genres.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: 'var(--accent)' }}></i>
          <p>Загрузка жанров...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ marginBottom: '30px' }}>
        <h2>Все жанры</h2>
        <div className="search-bar" style={{ marginTop: '20px', width: '100%', maxWidth: '400px' }}>
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Поиск жанров..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card-grid">
        {filteredGenres.map(genre => (
          <Link href={`/genre/${genre.id}`} key={genre.id} className="card" style={{ textAlign: 'center' }}>
            <div className="card-image"></div>
            <div className="card-title">{genre.name}</div>
            <div className="card-sub">{genre.description || 'Популярные треки в этом жанре'}</div>
          </Link>
        ))}
      </div>

      {filteredGenres.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <i className="fas fa-search" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
          <p>Жанры не найдены</p>
        </div>
      )}
    </Layout>
  );
}