import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => {
    const data = response.data

    if (!data.success) {
      return Promise.reject(
        new Error(data.message || 'Request failed')
      )
    }

    return data
  },
  (error) => {
    return Promise.reject(
      error.response?.data?.message ||
      error.message ||
      'Something went wrong'
    )
  }
)

export const authorLogin = (b) =>
  api.post('/auth/author/login', b)

export const adminLogin = (b) =>
  api.post('/auth/admin/login', b)

export const logout = () =>
  api.post('/auth/logout')

export const getMe = () =>
  api.get('/auth/me')

export const getMyBooks = () =>
  api.get('/author/books')

export const getProfile = () =>
  api.get('/author/profile')

export const updateProfile = (b) =>
  api.patch('/author/profile', b)

export const getMyTickets = (params = {}) =>
  api.get('/author/tickets', { params })

export const getMyTicketById = (id) =>
  api.get(`/author/tickets/${id}`)

export const createTicket = (b) =>
  api.post('/author/tickets', b)

export const adminGetTickets = (params = {}) =>
  api.get('/admin/tickets', { params })

export const adminGetTicketById = (id) =>
  api.get(`/admin/tickets/${id}`)

export const adminUpdateTicket = (id, b) =>
  api.patch(`/admin/tickets/${id}`, b)

export const adminRespondTicket = (id, b) =>
  api.post(`/admin/tickets/${id}/respond`, b)

export const adminGetDraft = (id, regen = false) =>
  api.get(`/admin/tickets/${id}/draft`, {
    params: { regenerate: regen },
  })

export const adminGetStats = () =>
  api.get('/admin/tickets/stats')

export const adminGetAuthors = (params = {}) =>
  api.get('/admin/authors', { params })

export const adminGetAuthorById = (id) =>
  api.get(`/admin/authors/${id}`)