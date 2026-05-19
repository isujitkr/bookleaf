import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminLayout() {
  const { user, Logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    Logout()
    navigate('/admin/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">Book<span>Leaf</span> <span style={{ fontSize: 11, fontWeight: 400, color: '#6b6b67' }}>Admin</span></div>
        <nav className="sidebar-nav">
          <NavLink to="/admin/dashboard">📊 Dashboard</NavLink>
          <NavLink to="/admin/tickets">🎫 Ticket Queue</NavLink>
          <NavLink to="/admin/authors">👥 Authors</NavLink>
        </nav>
        <div className="sidebar-footer">
          <strong>{user?.name}</strong>
          <span>{user?.role}</span>
          <br />
          <button
            className="btn btn-outline btn-sm"
            style={{ marginTop: 8 }}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}