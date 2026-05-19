import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  adminGetTicketById,
  adminUpdateTicket,
  adminRespondTicket,
  adminGetDraft,
} from "../../services/api";
import { useSocket } from "../../hooks/useSocket";
import {
  Spinner,
  Alert,
  StatusBadge,
  PriorityBadge,
  fmtDateTime,
} from "../../components/Shared";

const CATEGORIES = [
  "Royalty & Payments",
  "ISBN & Metadata Issues",
  "Printing & Quality",
  "Distribution & Availability",
  "Book Status & Production Updates",
  "General Inquiry",
];

const AI_ERROR_LABELS = {
  AI_RATE_LIMITED: "AI is rate-limited — wait a moment then try again.",
  AI_KEY_MISSING:
    "AI is not configured (missing API key). Write a response manually.",
  AI_INVALID_RESPONSE: "AI returned an unexpected response. Try regenerating.",
  AI_UNAVAILABLE:
    "AI service is temporarily unavailable. Write a response manually.",
};

function aiErrorLabel(code) {
  return AI_ERROR_LABELS[code] || "AI unavailable. Write a response manually.";
}

export default function AdminTicketDetail() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Reply form
  const [reply, setReply] = useState("");
  const [isNote, setIsNote] = useState(false);
  const [sending, setSending] = useState(false);

  const [draft, setDraft] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftMsg, setDraftMsg] = useState(""); // success message
  const [draftErr, setDraftErr] = useState(""); // error message

  const [overrides, setOverrides] = useState({
    status: "",
    category: "",
    priority: "",
  });

  const load = () =>
    adminGetTicketById(id)
      .then((r) => {
        setTicket(r.data);
        setOverrides({
          status: r.data.status,
          category: r.data.category,
          priority: r.data.priority,
        });
      })
      .catch((e) => setErr(e.message));

  useEffect(() => {
    load();
  }, [id]);

  useSocket((socket) => {
    socket.on("ticket:statusUpdate", ({ ticket_id, status }) => {
      console.log("STATUS UPDATE", { ticket_id, status });
      if (ticket_id === id) {
        setTicket((prev) => (prev ? { ...prev, status } : prev));
      }
    });

    socket.on("ticket:newResponse", (data) => {
      console.log("NEW RESPONSE", data);

      if (data.ticket_id === id) {
        setTicket((prev) => ({
          ...prev,
          status: data.status,
          responses: [...prev.responses, data.response],
        }));
      }
    });
  });

  const saveOverrides = async () => {
    setSaving(true);
    setMsg("");
    try {
      const updated = await adminUpdateTicket(id, {
        status: overrides.status,
        category: overrides.category,
        priority: overrides.priority,
      });
      setTicket(updated.data);
      setMsg("Ticket updated.");
    } catch (ex) {
      setMsg("Error: " + ex.message);
    } finally {
      setSaving(false);
    }
  };

  const assignMe = async () => {
    setSaving(true);
    try {
      const updated = await adminUpdateTicket(id, { assign_to_me: true });
      setTicket(updated.data);
    } catch (ex) {
      setMsg("Error: " + ex.message);
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const updated = await adminRespondTicket(id, {
        message: reply,
        is_internal_note: isNote,
      });
      setTicket(updated.data);
      setReply("");
    } catch (ex) {
      setMsg("Error: " + ex.message);
    } finally {
      setSending(false);
    }
  };

  const fetchDraft = async (regen = false) => {
    setDraftLoading(true);
    setDraftMsg("");
    setDraftErr("");
    try {
      const res = await adminGetDraft(id, regen);
      setDraft(res.data.draft);
      setReply(res.data.draft);
      setIsNote(false);
      setDraftMsg(
        regen
          ? "✓ Draft regenerated."
          : "✓ Draft loaded — edit before sending.",
      );
    } catch (ex) {
      const aiCode = ex.ai_error || null;
      setDraftErr(aiCode ? aiErrorLabel(aiCode) : ex.message);
    } finally {
      setDraftLoading(false);
    }
  };

  if (err)
    return (
      <>
        <Link
          to="/admin/tickets"
          className="btn btn-outline btn-sm"
          style={{ marginBottom: 16 }}
        >
          ← Back
        </Link>
        <Alert type="error">{err}</Alert>
      </>
    );
  if (!ticket) return <Spinner />;

  const ai = ticket.ai_meta || {};

  return (
    <div>
      <Link
        to="/admin/tickets"
        className="btn btn-outline btn-sm"
        style={{ marginBottom: 16 }}
      >
        ← Back to Queue
      </Link>

      {msg && (
        <Alert type={msg.startsWith("Error") ? "error" : "success"}>
          {msg}
        </Alert>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div>
          {/* Header */}
          <div className="card">
            <div
              style={{
                fontSize: 11,
                fontFamily: "monospace",
                color: "#6b6b67",
                marginBottom: 4,
              }}
            >
              {ticket.ticket_id}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              {ticket.subject}
            </div>

            <div className="ticket-meta-row">
              <span>
                <strong>Author:</strong> {ticket.author_name} (
                {ticket.author_email})
              </span>
              <span>
                <strong>Book:</strong> {ticket.book_title || "General"}
              </span>
              <span>
                <strong>Submitted:</strong> {fmtDateTime(ticket.createdAt)}
              </span>
              {ticket.assigned_to_name && (
                <span>
                  <strong>Assigned:</strong> {ticket.assigned_to_name}
                </span>
              )}
            </div>

            <div
              style={{
                background: "#f9fafb",
                border: "1px solid #e2e2de",
                borderRadius: 6,
                padding: "12px 14px",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              {ticket.description}
            </div>
          </div>

          {/* Thread */}
          <div className="card">
            <div className="card-title">Conversation</div>

            {ticket.responses.length === 0 && (
              <div className="text-muted text-sm" style={{ marginBottom: 12 }}>
                No messages yet.
              </div>
            )}

            <div className="thread">
              {ticket.responses.map((r, i) => (
                <div key={i}>
                  <div
                    className={`message-bubble ${r.sent_by === "author" ? "from-author" : r.is_internal_note ? "internal" : "from-admin"}`}
                  >
                    <div className="message-meta">
                      {r.sender_name}
                      {r.is_internal_note && <em> · Internal Note</em>}
                      {" · "}
                      {fmtDateTime(r.createdAt)}
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{r.message}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply box */}
            <div style={{ marginTop: 16 }}>
              <div className="ai-box" style={{ marginBottom: 10 }}>
                <div className="ai-box-title">✨ AI Draft (Gemini)</div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => fetchDraft(false)}
                    disabled={draftLoading}
                  >
                    {draftLoading ? "Generating…" : "Load AI Draft"}
                  </button>
                  {draft && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => fetchDraft(true)}
                      disabled={draftLoading}
                    >
                      ↺ Regenerate
                    </button>
                  )}
                  {draftMsg && (
                    <span className="text-sm" style={{ color: "#15803d" }}>
                      {draftMsg}
                    </span>
                  )}
                </div>
                {/* Dedicated AI error display — distinct from generic form errors */}
                {draftErr && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: "#b91c1c",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: 4,
                      padding: "6px 10px",
                    }}
                  >
                    ⚠ {draftErr}
                  </div>
                )}
              </div>

              <textarea
                rows={5}
                placeholder={
                  isNote
                    ? "Write an internal note (not visible to author)…"
                    : "Write a reply to the author…"
                }
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                style={{
                  marginBottom: 8,
                  borderColor: isNote ? "#fde68a" : undefined,
                  background: isNote ? "#fefce8" : undefined,
                }}
              />

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                >
                  {sending ? "Sending…" : isNote ? "Save Note" : "Send Reply"}
                </button>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isNote}
                    onChange={(e) => setIsNote(e.target.checked)}
                  />
                  Internal note (admin-only)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right sidebar ─────────────────────────────────────────────── */}
        <div>
          <div className="card">
            <div className="card-title">Ticket Controls</div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                value={overrides.status}
                onChange={(e) =>
                  setOverrides((o) => ({ ...o, status: e.target.value }))
                }
              >
                <option>Open</option>
                <option>In Progress</option>
                <option>Resolved</option>
                <option>Closed</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Priority{" "}
                <span className="text-muted text-sm">(override AI)</span>
              </label>
              <select
                value={overrides.priority}
                onChange={(e) =>
                  setOverrides((o) => ({ ...o, priority: e.target.value }))
                }
              >
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
              {ai.priority_overridden_by && (
                <div className="form-hint">
                  Overridden by {ai.priority_overridden_by}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                Category{" "}
                <span className="text-muted text-sm">(override AI)</span>
              </label>
              <select
                value={overrides.category}
                onChange={(e) =>
                  setOverrides((o) => ({ ...o, category: e.target.value }))
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              {ai.category_overridden_by && (
                <div className="form-hint">
                  Overridden by {ai.category_overridden_by}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={saveOverrides}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
              {!ticket.assigned_to && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={assignMe}
                  disabled={saving}
                >
                  Assign to me
                </button>
              )}
            </div>
          </div>

          {/* AI Analysis */}
          <div className="card">
            <div className="card-title">
              AI Analysis{" "}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 400,
                  color: "#6b6b67",
                  textTransform: "none",
                  letterSpacing: 0,
                }}
              >
                · Gemini
              </span>
            </div>

            {/* Show a warning if AI classification failed on ticket creation */}
            {ai.classification_error && (
              <div
                style={{
                  fontSize: 11,
                  color: "#92400e",
                  background: "#fef3c7",
                  border: "1px solid #fde68a",
                  borderRadius: 4,
                  padding: "5px 8px",
                  marginBottom: 10,
                }}
              >
                ⚠ Auto-classification failed ({ai.classification_error}). Values
                below are defaults — review and override if needed.
              </div>
            )}

            <div style={{ fontSize: 12, marginBottom: 10 }}>
              <div className="text-muted" style={{ marginBottom: 2 }}>
                Suggested Category
              </div>
              <div>{ai.suggested_category || "—"}</div>
              {ai.category_confidence != null && !ai.classification_error && (
                <div
                  className="text-muted"
                  style={{ fontSize: 11, marginTop: 1 }}
                >
                  Confidence: {Math.round(ai.category_confidence * 100)}%
                </div>
              )}
            </div>

            <div style={{ fontSize: 12, marginBottom: 10 }}>
              <div className="text-muted" style={{ marginBottom: 2 }}>
                Suggested Priority
              </div>
              <div>
                <PriorityBadge priority={ai.suggested_priority} />
              </div>
            </div>

            {ai.priority_reasoning && !ai.classification_error && (
              <div style={{ fontSize: 12 }}>
                <div className="text-muted" style={{ marginBottom: 2 }}>
                  Reasoning
                </div>
                <div style={{ lineHeight: 1.6, color: "#374151" }}>
                  {ai.priority_reasoning}
                </div>
              </div>
            )}
          </div>

          {/* Current state */}
          <div className="card">
            <div className="card-title">Current State</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            {ticket.assigned_to_name && (
              <div className="text-sm text-muted" style={{ marginTop: 8 }}>
                Assigned to {ticket.assigned_to_name}
              </div>
            )}
            {ticket.first_response_at && (
              <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                First response: {fmtDateTime(ticket.first_response_at)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
