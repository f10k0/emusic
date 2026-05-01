import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const res = await api.get('/admin/submissions/pending');
      setSubmissions(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.put(`/admin/submissions/${id}/approve`);
      fetchPending();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (id) => {
    try {
      await api.put(`/admin/submissions/${id}/reject`);
      fetchPending();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <Layout>
        <h2>Заявки на модерацию</h2>
        {submissions.length === 0 ? (
          <p>Нет ожидающих заявок</p>
        ) : (
          <div className="track-list">
            {submissions.map(sub => (
              <div key={sub.id} className="submission-item">
                <div>
                  <strong>{sub.track?.title}</strong> от {sub.artist?.name}
                  <br />
                  <small>Загружено: {new Date(sub.submitted_at).toLocaleString()}</small>
                </div>
                <div>
                  <button className="btn" onClick={() => handleApprove(sub.id)}>Одобрить</button>
                  <button className="btn-secondary" onClick={() => handleReject(sub.id)}>Отклонить</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}