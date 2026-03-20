import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import useAuthStore from '../store/authStore';

export default function Login() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    console.log('Попытка входа:', form.username);
    
    try {
      await login(form.username, form.password);
      console.log('Вход успешен, редирект на главную');
      router.push('/');
    } catch (err) {
      console.error('Ошибка входа:', err);
      
      if (err.code === 'ECONNABORTED') {
        setError('Сервер не отвечает. Проверьте, запущен ли бэкенд');
      } else if (err.response) {
        if (err.response.status === 401) {
          setError('Неверное имя пользователя или пароль');
        } else if (err.response.status === 400) {
          setError(err.response.data?.detail || 'Ошибка входа');
        } else {
          setError(`Ошибка сервера: ${err.response.status}`);
        }
      } else if (err.request) {
        setError('Нет ответа от сервера. Проверьте подключение к бэкенду');
      } else {
        setError('Ошибка при входе. Попробуйте позже');
      }
    }
  };

  return (
    <Layout>
      <div className="form-container">
        <h2>Вход</h2>
        
        <div style={{ 
          background: 'var(--bg-secondary)', 
          padding: '10px', 
          borderRadius: '10px', 
          marginBottom: '20px',
          fontSize: '0.9rem',
          color: 'var(--text-secondary)'
        }}>
          <p><strong>Нет аккаунта?</strong> Сначала зарегистрируйтесь</p>
        </div>
        
        {error && (
          <div style={{ 
            backgroundColor: 'rgba(255, 75, 75, 0.1)', 
            border: '1px solid #ff4b4b', 
            borderRadius: '12px', 
            padding: '12px', 
            marginBottom: '20px',
            color: '#ff6b6b'
          }}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Имя пользователя</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Введите username"
              required
            />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Введите пароль"
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn" 
            disabled={isLoading}
            style={{ width: '100%' }}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                Вход...
              </>
            ) : 'Войти'}
          </button>
        </form>
        <div className="form-footer">
          Нет аккаунта? <Link href="/register">Зарегистрироваться</Link>
        </div>
      </div>
    </Layout>
  );
}