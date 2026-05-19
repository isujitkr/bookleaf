import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Spinner } from './components/Shared'
import AuthorLayout from './components/AuthorLayout'
import AdminLayout  from './components/AdminLayout'
import AuthorLoginPage from './pages/AuthorLogin'
import AdminLoginPage  from './pages/AdminLogin'
import AuthorBooks       from './pages/author/Books'
import AuthorTickets     from './pages/author/Tickets'
import AuthorTicketDetail from './pages/author/TicketDetail'
import SubmitTicket      from './pages/author/SubmitTicket'
import AuthorProfile     from './pages/author/Profile'
import AdminDashboard    from './pages/admin/Dashboard'
import AdminTickets      from './pages/admin/Tickets'
import AdminTicketDetail from './pages/admin/TicketDetail'
import AdminAuthors      from './pages/admin/Authors'
import AdminAuthorDetail from './pages/admin/AuthorDetail'

function RequireAuthor({ children }) {
  const { isAuthor, ready } = useAuth()
  const loc = useLocation()
  if (!ready) return <Spinner />
  if (!isAuthor) return <Navigate to="/login" state={{ from: loc }} replace />
  return children
}

function RequireAdmin({ children }) {
  const { isAdmin, ready } = useAuth()
  const loc = useLocation()
  if (!ready) return <Spinner />
  if (!isAdmin) return <Navigate to="/admin/login" state={{ from: loc }} replace />
  return children
}

function AppRoutes() {
  const { isAuthor, isAdmin, ready } = useAuth()
  if (!ready) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spinner /></div>

  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={
        isAuthor ? <Navigate to="/author/books" replace /> :
        isAdmin  ? <Navigate to="/admin/dashboard" replace /> :
                   <Navigate to="/login" replace />
      } />

      {/* Auth */}
      <Route path="/login"       element={<AuthorLoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Author portal */}
      <Route path="/author" element={<RequireAuthor><AuthorLayout /></RequireAuthor>}>
        <Route index element={<Navigate to="books" replace />} />
        <Route path="books"           element={<AuthorBooks />} />
        <Route path="tickets"         element={<AuthorTickets />} />
        <Route path="tickets/new"     element={<SubmitTicket />} />
        <Route path="tickets/:id"     element={<AuthorTicketDetail />} />
        <Route path="profile"         element={<AuthorProfile />} />
      </Route>

      {/* Admin portal */}
      <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"         element={<AdminDashboard />} />
        <Route path="tickets"           element={<AdminTickets />} />
        <Route path="tickets/:id"       element={<AdminTicketDetail />} />
        <Route path="authors"           element={<AdminAuthors />} />
        <Route path="authors/:id"       element={<AdminAuthorDetail />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}