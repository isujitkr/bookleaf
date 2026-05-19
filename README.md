# BookLeaf — Author Support and Communication Portal

A full-stack author and admin support portal for BookLeaf Publishing. Authors can view their books, royalty data, and raise support tickets. Admins manage the ticket queue with AI-powered classification, priority scoring, and draft response generation.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Local Setup & Running](#local-setup--running)
4. [Environment Variables](#environment-variables)
5. [Architecture Decisions](#architecture-decisions)
6. [AI Integration](#ai-integration)
7. [API Reference](#api-reference)
8. [Real-time Events](#real-time-events-socketio)
9. [Sample Credentials](#sample-credentials)
10. [Known Limitations & Future Improvements](#known-limitations--future-improvements)

---

## Tech Stack

### Backend
| Layer | Technology | Why |
|-------|-----------|-----|
| Runtime | Node.js | Async I/O fits well for a real-time ticket system |
| Framework | Express.js | Minimal, flexible, widely understood |
| Database | MongoDB + Mongoose | Flexible schema suits evolving ticket/AI metadata fields |
| Auth | JWT + cookie-parser (HttpOnly cookies) | HttpOnly cookies prevent XSS token theft vs localStorage |
| Real-time | Socket.io | Abstracts WebSocket complexity, handles reconnection |
| AI | Google Gemini `gemini-3-flash-preview` | Fast, cost-efficient, strong JSON output for triage |
| Security | cors, express-rate-limit | Standard Express hardening |

### Frontend
| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | React 18 + Vite | Fast HMR, modern build tooling |
| Routing | React Router v6 | Nested routes map cleanly to the two portals |
| Styling | Plain CSS | No framework overhead; minimal UI was explicitly required |
| Real-time | socket.io-client | Pairs with backend Socket.io |
| State | React Context (AuthContext) | Auth state is global; no need for Redux at this scale |

---

## Project Structure

```
bookleaf/
├── backend/
│   ├── .env.example                # Environment variable template
│   └── src/
|       ├── server.js
|       ├── app.js
│       ├── config/
│       │   ├── database.js         # MongoDB connection
│       │   └── socket.js           # Socket.io init & JWT room assignment
│       ├── models/
│       │   ├── Author.js           # Author schema — refs Book by ObjectId
│       │   ├── Book.js             # Book schema — separate collection
│       │   ├── Admin.js            # Admin / support agent schema
│       │   └── Ticket.js           # Ticket + response thread + AI metadata
│       ├── controllers/
│       │   ├── authController.js   # Register & login for both roles
│       │   ├── authorController.js # Author profile, book views
│       │   └── ticketController.js # Full ticket CRUD + AI endpoints
│       ├── middleware/
│       │   ├── auth.js             # JWT guards: authorOnly, adminOnly
│       │   └── errorHandler.js     # Centralised error response formatter
│       ├── routes/
│       │   ├── auth.js
│       │   ├── author.js
│       │   └── admin.js
│       ├── services/
│       │   └── aiService.js        # All Gemini calls: triage + draft generation
│       └── utils/
│           ├── helpers.js          # ID generation, response envelope, pagination
│           └── seed.js             # Database seeder with sample data
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── .env.example     
    └── src/
        ├── main.jsx
        ├── App.jsx                 # All routes + RequireAuthor / RequireAdmin guards
        ├── styles/
        │   └── global.css          # Single CSS file — no framework
        ├── context/
        │   └── AuthContext.jsx     # Login/logout state, role detection
        ├── hooks/
        │   └── useSocket.js        # Socket.io connection with JWT auth
        ├── services/
        │   └── api.js              # All fetch calls centralised here
        ├── components/
        │   ├── Shared.jsx          # Badges, spinner, pagination, date formatters
        │   ├── AuthorLayout.jsx    # Sidebar + <Outlet> for author portal
        │   └── AdminLayout.jsx     # Sidebar + <Outlet> for admin portal
        └── pages/
            ├── AuthorLogin.jsx
            ├── AdminLogin.jsx
            ├── author/
            │   ├── Books.jsx           # Royalty cards per book
            │   ├── Tickets.jsx         # Ticket list + real-time status updates
            │   ├── TicketDetail.jsx    # Thread view + real-time new replies
            │   ├── SubmitTicket.jsx    # Book dropdown + support form
            │   └── Profile.jsx         # View & edit phone/city
            └── admin/
                ├── Dashboard.jsx       # Stats overview + real-time new ticket toasts
                ├── Tickets.jsx         # Queue with 4 filters + full-text search
                ├── TicketDetail.jsx    # Respond, AI draft, category/priority overrides, internal notes
                ├── Authors.jsx         # Paginated author list with search
                └── AuthorDetail.jsx    # Author profile + all books with royalty data
```

---

## Local Setup & Running

### Prerequisites
- Node.js v18+
- MongoDB running locally (or a MongoDB Atlas connection string)
- A Google Gemini API key (get one at [aistudio.google.com](https://aistudio.google.com))

### 1. Backend

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Open .env and fill in MONGODB_URI and GEMINI_API_KEY

# Start development server on port 8000
npm run dev
```

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start dev server on port 5173
npm run dev
```

Open `http://localhost:5173`. Vite automatically proxies all `/api` and `/socket.io` requests to `localhost:8000` — no CORS configuration needed in development.

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in the values:

```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017/bookleaf
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=your_gemini_api_key
ALLOWED_ORIGIN=http://localhost:8000
```

Copy `frontend/.env.example` to `frontend/.env` and fill in the values:

```env
VITE_API_URL=http://localhost:8000/api
VITE_SOCKET_URL=http://localhost:8000
VITE_URL=http://localhost:8000
```

> **Security note:** `GEMINI_API_KEY` is read exclusively from `process.env` in the backend — it is never hardcoded, never passed to the frontend, and never exposed in API responses.

---

## Architecture Decisions

### 1. Separate Author and Book models (not embedded)
Books are stored in their own collection and referenced from Author via ObjectId. This makes it straightforward to query, update, or add books independently without rewriting the entire author document. It also avoids MongoDB's 16MB document size limit if an author has many books over time.

### 2. JWT stored in HttpOnly cookies (via cookie-parser)
Tokens are set as HttpOnly cookies on login rather than returned in the response body for the client to store in localStorage. HttpOnly cookies cannot be read by JavaScript, which eliminates the most common XSS token theft vector. cookie-parser on the backend reads the token transparently from every request.

### 3. AI processing runs in the background (non-blocking)
When an author submits a ticket, the ticket is saved to MongoDB immediately and a `201` response is returned. The Gemini classification and priority scoring run inside `setImmediate()` after the response. This means ticket creation is never delayed by AI latency or failure — the author always gets an instant confirmation.

### 4. Socket.io rooms by role
Authors join a private room `author:<author_id>` so status updates and admin replies are delivered only to the right author. Admins join a shared `admins` room so any admin on duty receives new ticket notifications regardless of how many are logged in simultaneously.

### 5. Ticket response thread with internal notes flag
Admin replies and internal notes are stored in the same `responses[]` array on the ticket document, distinguished by an `is_internal_note` boolean. Author-facing endpoints filter out internal notes before sending the response. This keeps the data model simple while supporting both use cases.

### 6. Centralised API layer on the frontend
All `fetch` calls are in `src/services/api.js`. Pages never call `fetch` directly. This means base URL, auth headers, and error handling logic (including forwarding `ai_error` codes from 503 responses) live in one place and are easy to change.

### 7. Route guards with role-based redirects
`RequireAuthor` and `RequireAdmin` components in `App.jsx` check the decoded JWT role on mount and redirect unauthenticated users to the correct login page. The two portals (`/author/*` and `/admin/*`) are fully isolated — an author token cannot access any admin route.

---

## AI Integration

### Model
**Google Gemini `gemini-3-flash-preview`** via `@google/generative-ai`.  
Chosen for: fast inference, cost-efficient pricing, strong structured JSON output (critical for triage), and good instruction-following for on-brand draft responses. The `responseMimeType: 'application/json'` config on the triage model instructs Gemini to return valid JSON directly, reducing parse failures.

### What the AI does
1. **Auto-classification** — categorises the ticket into one of six categories.
2. **Priority scoring** — assigns Critical / High / Medium / Low with a one-sentence reasoning.
3. **Draft response generation** — writes a full support reply using the BookLeaf Knowledge Base, in BookLeaf's tone.

Admins can override the AI's category and priority at any time from the ticket detail page.

### Prompt strategy

**Triage prompt (classification + priority):**
- Classification and priority scoring are combined into **one API call**, not two. This halves the Gemini cost per new ticket.
- The prompt contains only the ticket subject, description, the six category names, and priority rules — nothing else.
- The Knowledge Base is **deliberately excluded** from triage. It adds ~800 tokens per call and contributes nothing to classifying "this is a royalty issue" vs "this is a printing issue." Sending it would roughly double the cost of every triage call.
- `maxOutputTokens: 120` — the model only needs to return a small JSON object.
- `temperature: 0.1` — low temperature for consistent, deterministic structured output.

**Draft response prompt:**
- The full Knowledge Base (~800 tokens) **is** included here because the model needs accurate policy details (royalty percentages, SLA timelines, platform names) to write a correct, on-brand reply.
- Only 5–6 fields from the ticket are sent: `author_name`, `category`, `priority`, `subject`, `description`, `book_title`. The full `responses[]` thread is excluded — the draft is a starting point the admin will edit, so sending conversation history adds cost without meaningful benefit.
- A `systemInstruction` establishes the BookLeaf support persona and constraints (120–220 words, no placeholders, sign off as "BookLeaf Support Team").
- `maxOutputTokens: 2000`, `temperature: 0.4` — more headroom for natural prose.

**Draft caching:**
- Generated drafts are stored in `ai_meta.draft_response` on the ticket in MongoDB.
- Subsequent "Load AI Draft" clicks return the cached version — **zero API calls, zero tokens**.
- A fresh generation only happens when the admin explicitly clicks "↺ Regenerate".

### Token usage summary

| Call | KB included | Thread included | Input fields | `maxOutputTokens` |
|------|-------------|-----------------|--------------|-------------------|
| Triage (classify + priority) | ❌ | ❌ | `subject`, `description` | 120 |
| Draft generation | ✅ | ❌ | 5–6 ticket fields | 2000 |
| Repeat draft view | — | — | cached from MongoDB | 0 |

### Error handling & graceful degradation

`aiService.js` never throws. Every function returns a safe fallback so that ticket creation and admin operations always succeed regardless of AI availability.

Error codes returned:

| Code | Meaning | What happens |
|------|---------|--------------|
| `AI_RATE_LIMITED` | Gemini returned 429 | Ticket created with default classification; admin sees "rate-limited" message |
| `AI_KEY_MISSING` | `GEMINI_API_KEY` not set | Same fallback; admin told to configure key |
| `AI_INVALID_RESPONSE` | Unparseable JSON from model | Fallback to defaults; logged server-side |
| `AI_UNAVAILABLE` | Network / server error | Same fallback; retry suggested |

The error code is stored in `ai_meta.classification_error` on the ticket and shown in the admin UI as an amber warning: *"Auto-classification failed — values are defaults, review and override."*

For the draft endpoint specifically, the backend returns a `503` with a human-readable message explaining the specific error type, so the admin knows whether to wait (rate limit) or write manually (key missing / unavailable).

---

## API Reference

### Authentication

JWT is set as an **HttpOnly cookie** on login. All protected routes read it automatically via cookie-parser.

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/author/register` | Public | Create author account |
| POST | `/api/auth/author/login` | Public | Author login → sets HttpOnly cookie |
| POST | `/api/auth/admin/register` | Public | Create admin account |
| POST | `/api/auth/admin/login` | Public | Admin login → sets HttpOnly cookie |
| GET | `/api/auth/me` | Both | Get current user info from cookie |

---

### Author Portal

All routes require author authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/author/profile` | Get author profile |
| PATCH | `/api/author/profile` | Update phone / city |
| GET | `/api/author/books` | List all books with full royalty data |
| GET | `/api/author/books/:book_id` | Single book detail |
| POST | `/api/author/tickets` | Submit a new support ticket |
| GET | `/api/author/tickets` | List own tickets (`?status=Open\|In Progress\|Resolved\|Closed`) |
| GET | `/api/author/tickets/:ticket_id` | Ticket detail with public response thread |

**Submit Ticket — request body:**
```json
{
  "book_id": "BK001",
  "subject": "Royalty not received for Q3",
  "description": "I haven't received my ₹3,570 royalty since October...",
  "attachment_url": "https://..."
}
```
Use `"book_id": "general"` for account-level queries not related to a specific book.

---

### Admin Portal

All routes require admin authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/tickets/stats` | Dashboard statistics (totals by status, priority, category) |
| GET | `/api/admin/tickets` | Ticket queue — see filters below |
| GET | `/api/admin/tickets/:ticket_id` | Full ticket detail including AI metadata and internal notes |
| PATCH | `/api/admin/tickets/:ticket_id` | Update status, override AI category/priority, assign to self |
| POST | `/api/admin/tickets/:ticket_id/respond` | Send a reply or save an internal note |
| GET | `/api/admin/tickets/:ticket_id/draft` | Get cached AI draft (add `?regenerate=true` to force a new one) |
| GET | `/api/admin/authors` | Paginated author list with search |
| GET | `/api/admin/authors/:author_id` | Author detail with all books |

**Ticket queue filter params:**
```
?status=Open|In Progress|Resolved|Closed
&priority=Critical|High|Medium|Low
&category=Royalty & Payments|ISBN & Metadata Issues|Printing & Quality|Distribution & Availability|Book Status & Production Updates|General Inquiry
&author_id=AUTH001
&assigned_to=ADM002
&from_date=2025-01-01
&to_date=2025-12-31
&search=<searches subject, author name, email, ticket ID>
&page=1&limit=20
```
Results are sorted by priority weight (Critical first) then age (oldest first) to surface the most urgent unresolved tickets at the top.

**Update ticket — request body:**
```json
{
  "status": "In Progress",
  "category": "Royalty & Payments",
  "priority": "Critical",
  "assign_to_me": true
}
```
Any combination of fields can be sent. `category` and `priority` changes are recorded as admin overrides in `ai_meta`.

**Respond to ticket — request body:**
```json
{
  "message": "Dear Priya, we have initiated the bank transfer...",
  "is_internal_note": false
}
```
Set `is_internal_note: true` for notes only visible to admins — these are filtered out of the author-facing ticket view.

---

## Real-time Events (Socket.io)

The frontend connects with the JWT token in the Socket.io handshake. The backend verifies it and assigns the socket to the correct room automatically.

| Event | Emitted to | Payload | When |
|-------|-----------|---------|------|
| `ticket:new` | `admins` room | `{ ticket_id, subject, author_name, category, priority, ai_error }` | Author submits a ticket |
| `ticket:statusUpdate` | `author:<id>` | `{ ticket_id, status }` | Admin changes ticket status |
| `ticket:newResponse` | `author:<id>` | `{ ticket_id, response, status }` | Admin sends a public reply |

Authors see live status changes and new replies without refreshing. Admins see new ticket toasts on the dashboard and queue, including an amber indicator if AI classification failed.

---

## Sample Credentials

**Authors:**
| Email | Password |
|-------|----------|
| priya.sharma@email.com    | password123 |
| rohit.kapoor@email.com    | password123 |
| ananya.reddy@email.com    | password123 |
| vikram.joshi@email.com    | password123 |
| mira.nair@email.com       | password123 |
| arjun.malhotra@email.com  | password123 |
| sneha.kulkarni@email.com  | password123 |
| farhan.sheikh@email.com   | password123 |
| kavika.deshmukh@email.com | password123 |
| diya.chatterjee@email.com | password123 |

**Admins:**
| Email | Password | Role |
|-------|----------|------|
| sujit.kumar@bookleaf.com | adminpass123 | super_admin |
| ram.gupta@bookleaf.com   | adminpass123 | super_admin |

---

## Known Limitations & Future Improvements

### Current limitations

**File attachments are UI-only.**
The ticket submission form has a file input field but actual upload is not implemented. Authors are currently prompted to paste image links in the description instead. A real implementation would use S3 or Cloudinary with pre-signed URLs.

**No email notifications.**
Authors and admins are not emailed on ticket updates. The system relies entirely on in-app real-time events. In production, a transactional email service (SendGrid, AWS SES) should send notifications for ticket creation, status changes, and new replies — especially for users who aren't actively logged in.

**Admin registration is open.**
`POST /api/auth/admin/register` has no protection. In production this should require either a super-admin JWT or an invite token to prevent unauthorised admin account creation.

**No refresh token / token rotation.**
JWTs expire after 7 days with no refresh mechanism. Users are silently logged out when the token expires. A refresh token pattern with short-lived access tokens would be more secure.

**AI draft ignores conversation history.**
If a ticket already has several back-and-forth messages, the AI draft is generated without that context. A future improvement would be to summarise the thread and include it in the draft prompt so the model can write a contextually appropriate follow-up.

**No pagination on book list.**
Authors with a large number of books get all books returned in a single response. Not a practical issue at current scale but should be paginated for production.

**Socket.io runs in-process.**
Socket.io state is held in the Node.js process memory. If the backend is scaled to multiple instances, events emitted on one instance won't reach clients connected to another. The fix is to add `socket.io-redis` adapter so all instances share a pub/sub channel.

### Given more time, I would add

- **Email notifications** via SendGrid for all ticket lifecycle events
- **File upload** with S3 pre-signed URLs for ticket attachments
- **Refresh token rotation** for more secure session management
- **Rate limiting per author** on ticket submission to prevent spam
- **Webhook support** so BookLeaf can push production status updates (e.g. book goes live) directly into the ticket system
- **AI response quality feedback** — a thumbs up/down on AI drafts to collect data for prompt improvement over time
- **Full-text search index** on MongoDB for the ticket queue search (currently uses regex, which doesn't scale)
- **Redis adapter** for Socket.io to support horizontal scaling
- **Unit and integration tests** for the AI service (mocking Gemini responses) and ticket controller
