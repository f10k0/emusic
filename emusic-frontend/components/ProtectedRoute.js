import useRequireAuth from '../hooks/useRequireAuth';

export default function ProtectedRoute({ children, requiredRole = null }) {
  const { user, ready } = useRequireAuth();

  if (!ready) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 48, color: 'var(--accent)', marginBottom: 20 }}></i>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (requiredRole && user?.role !== requiredRole) return null;

  return children;
}
