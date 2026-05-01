import { create } from 'zustand';
import api from '../lib/api';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  
  login: async (username, password) => {
    set({ isLoading: true });
    try {
      console.log('Отправка запроса на логин...');
      
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      
      const response = await api.post('/users/token', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      console.log('Ответ от сервера:', response.data);
      
      const { access_token } = response.data;
      localStorage.setItem('access_token', access_token);
      
      // Устанавливаем токен в api
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Загружаем пользователя
      const userResponse = await api.get('/users/me');
      set({ user: userResponse.data, token: access_token, isLoading: false });
      
      console.log('Пользователь загружен:', userResponse.data);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      localStorage.removeItem('access_token');
      delete api.defaults.headers.common['Authorization'];
      set({ isLoading: false });
      throw error;
    }
  },
  
  register: async (username, email, password) => {
    set({ isLoading: true });
    try {
      console.log('Регистрация:', { username, email });
      
      await api.post('/users/register', { username, email, password });
      console.log('Регистрация успешна, выполняем вход...');
      
      return await get().login(username, password);
    } catch (error) {
      console.error('Registration failed:', error);
      set({ isLoading: false });
      throw error;
    }
  },
  
  logout: () => {
    console.log('Выход из системы');
    localStorage.removeItem('access_token');
    delete api.defaults.headers.common['Authorization'];
    set({ user: null, token: null });
  },
  
  fetchUser: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      set({ user: null });
      return null;
    }

    try {
      console.log('Загрузка данных пользователя...');
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const response = await api.get('/users/me');
      console.log('Пользователь загружен:', response.data);
      set({ user: response.data, token });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('access_token');
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, token: null });
      }
      throw error;
    }
  },
}));

// Инициализация при загрузке
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('access_token');
  if (token) {
    console.log('Токен найден при загрузке, загружаем пользователя...');
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    useAuthStore.getState().fetchUser().catch(() => {
      localStorage.removeItem('access_token');
      delete api.defaults.headers.common['Authorization'];
    });
  }
}

export default useAuthStore;