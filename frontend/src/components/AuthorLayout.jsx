import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthorLayout() {
  const { user, Logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    Logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">Book<span>Leaf</span></div>
        <nav className="sidebar-nav">
          <NavLink to="/author/books">📚 My Books</NavLink>
          <NavLink to="/author/tickets">🎫 My Tickets</NavLink>
          <NavLink to="/author/tickets/new">✏️ Submit Query</NavLink>
          <NavLink to="/author/profile">👤 Profile</NavLink>
        </nav>
        <div className="sidebar-footer">
          <strong>{user?.name}</strong>
          <span>{user?.author_id}</span>
          <br />
          <button
            className="btn btn-outline btn-sm mt-8"
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