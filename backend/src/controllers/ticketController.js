const Ticket = require('../models/Ticket');
const Author = require('../models/Author');
const { apiResponse, generateId, parsePagination } = require('../utils/helpers');
const { processTicketWithAI, generateDraftResponse, AI_ERRORS } = require('../services/aiService');

exports.createTicket = async (req, res, next) => {
  try {
    const { book_id, subject, description, attachment_url } = req.body;
    const author = req.author;

    if (!subject || !description) {
      return apiResponse(res, 400, false, 'subject and description are required');
    }

    // Resolve book title if book_id is provided
    let book_title = null;
    if (book_id && book_id !== 'general') {
      const book = author.books.find((b) => b.book_id === book_id);
      if (!book) return apiResponse(res, 404, false, 'Book not found in your account');
      book_title = book.title;
    }

    const ticket = await Ticket.create({
      ticket_id: generateId('TKT'),
      author_id: author.author_id,
      author_name: author.name,
      author_email: author.email,
      book_id: book_id && book_id !== 'general' ? book_id : null,
      book_title,
      subject,
      description,
      attachment_url: attachment_url || null,
    });

    // ── AI processing in background (non-blocking) ────────────────────────
    // processTicketWithAI never throws — it returns fallback values on any
    // AI failure, so ticket creation is never blocked by AI downtime.
    setImmediate(async () => {
      const aiResult = await processTicketWithAI(subject, description);

      const update = {
        category: aiResult.category,
        priority: aiResult.priority,
        'ai_meta.suggested_category':  aiResult.category,
        'ai_meta.category_confidence': aiResult.category_confidence,
        'ai_meta.suggested_priority':  aiResult.priority,
        'ai_meta.priority_reasoning':  aiResult.priority_reasoning,
      };

      // Store AI error reason so admins see why classification fell back to default
      if (aiResult.ai_error) {
        update['ai_meta.classification_error'] = aiResult.ai_error;
      }

      await Ticket.findByIdAndUpdate(ticket._id, update).catch((dbErr) =>
        console.error('[ticketController] Failed to save AI result:', dbErr.message)
      );

      // Emit socket event for real-time admin update
      const io = req.app.get('io');
      if (io) {
        io.to('admins').emit('ticket:new', {
          ticket_id:   ticket.ticket_id,
          subject:     ticket.subject,
          author_name: ticket.author_name,
          category:    aiResult.category,
          priority:    aiResult.priority,
          ai_error:    aiResult.ai_error || null,
        });
      }
    });

    return apiResponse(res, 201, true, 'Ticket submitted successfully', {
      ticket_id: ticket.ticket_id,
      status: ticket.status,
      createdAt: ticket.createdAt,
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyTickets = async (req, res, next) => {
  try {
    const { status, page, limit, skip } = {
      status: req.query.status,
      ...parsePagination(req.query),
    };

    const filter = { author_id: req.author.author_id };
    if (status) filter.status = status;

    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .select('-ai_meta.draft_response') // don't expose draft to author
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Ticket.countDocuments(filter),
    ]);

    // Strip internal notes from responses before sending to author
    const sanitized = tickets.map((t) => {
      const obj = t.toObject();
      obj.responses = obj.responses.filter((r) => !r.is_internal_note);
      return obj;
    });

    return apiResponse(res, 200, true, 'Tickets fetched', sanitized, {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyTicketById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({
      ticket_id: req.params.ticket_id,
      author_id: req.author.author_id,
    });
    if (!ticket) return apiResponse(res, 404, false, 'Ticket not found');

    const obj = ticket.toObject();
    obj.responses = obj.responses.filter((r) => !r.is_internal_note);
    delete obj.ai_meta.draft_response;

    return apiResponse(res, 200, true, 'Ticket fetched', obj);
  } catch (err) {
    next(err);
  }
};

exports.adminGetTickets = async (req, res, next) => {
  try {
    const { status, category, priority, author_id, assigned_to, from_date, to_date, search } =
      req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (author_id) filter.author_id = author_id;
    if (assigned_to) filter.assigned_to = assigned_to;

    if (from_date || to_date) {
      filter.createdAt = {};
      if (from_date) filter.createdAt.$gte = new Date(from_date);
      if (to_date) filter.createdAt.$lte = new Date(to_date);
    }

    if (search) {
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { author_name: { $regex: search, $options: 'i' } },
        { author_email: { $regex: search, $options: 'i' } },
        { ticket_id: { $regex: search, $options: 'i' } },
      ];
    }

    const sort = {
      priority: 1, 
      createdAt: 1,
    };

    const priorityOrder = { Critical: 1, High: 2, Medium: 3, Low: 4 };

    const [rawTickets, total] = await Promise.all([
      Ticket.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit),
      Ticket.countDocuments(filter),
    ]);

    rawTickets.sort((a, b) => {
      const pa = priorityOrder[a.priority] || 5;
      const pb = priorityOrder[b.priority] || 5;
      if (pa !== pb) return pa - pb;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    return apiResponse(res, 200, true, 'Tickets fetched', rawTickets, {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

exports.adminGetTicketById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ ticket_id: req.params.ticket_id });
    if (!ticket) return apiResponse(res, 404, false, 'Ticket not found');
    return apiResponse(res, 200, true, 'Ticket fetched', ticket);
  } catch (err) {
    next(err);
  }
};

exports.adminUpdateTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ ticket_id: req.params.ticket_id });
    if (!ticket) return apiResponse(res, 404, false, 'Ticket not found');

    const admin = req.admin;
    const updates = {};

    // Status transitions
    if (req.body.status) {
      updates.status = req.body.status;
      if (req.body.status === 'Resolved' && !ticket.resolved_at) {
        updates.resolved_at = new Date();
      }
      if (req.body.status === 'Closed' && !ticket.closed_at) {
        updates.closed_at = new Date();
      }
    }

    // Category override
    if (req.body.category) {
      updates.category = req.body.category;
      updates['ai_meta.category_overridden_by'] = admin.admin_id;
    }

    // Priority override
    if (req.body.priority) {
      updates.priority = req.body.priority;
      updates['ai_meta.priority_overridden_by'] = admin.admin_id;
    }

    // Self-assign
    if (req.body.assign_to_me) {
      updates.assigned_to = admin.admin_id;
      updates.assigned_to_name = admin.name;
      updates.assigned_at = new Date();
    }

    const updated = await Ticket.findOneAndUpdate(
      { ticket_id: req.params.ticket_id },
      { $set: updates },
      { new: true }
    );

    // Real-time: notify the author's room of status change
    const io = req.app.get('io');
    if (io && req.body.status) {
      io.to(`author:${ticket.author_id}`).emit('ticket:statusUpdate', {
        ticket_id: ticket.ticket_id,
        status: req.body.status,
      });
    }

    return apiResponse(res, 200, true, 'Ticket updated', updated);
  } catch (err) {
    next(err);
  }
};

exports.adminRespondToTicket = async (req, res, next) => {
  try {
    const { message, is_internal_note = false } = req.body;
    if (!message) return apiResponse(res, 400, false, 'message is required');

    const admin = req.admin;
    const ticket = await Ticket.findOne({ ticket_id: req.params.ticket_id });
    if (!ticket) return apiResponse(res, 404, false, 'Ticket not found');

    const newResponse = {
      sent_by: 'admin',
      sender_id: admin.admin_id,
      sender_name: admin.name,
      message,
      is_internal_note,
    };

    // Track first public response time
    const isPublicResponse = !is_internal_note;
    const updates = { $push: { responses: newResponse } };
    if (isPublicResponse && !ticket.first_response_at) {
      updates.$set = { first_response_at: new Date() };
    }
    // Auto-move to In Progress on first admin reply
    if (isPublicResponse && ticket.status === 'Open') {
      if (!updates.$set) updates.$set = {};
      updates.$set.status = 'In Progress';
    }

    const updated = await Ticket.findOneAndUpdate(
      { ticket_id: req.params.ticket_id },
      updates,
      { new: true }
    );

    const latestResponse =
  updated.responses[updated.responses.length - 1];

    if (isPublicResponse) {
      const io = req.app.get('io');
      if (io) {
        io.to(`author:${ticket.author_id}`).emit('ticket:newResponse', {
          ticket_id: ticket.ticket_id,
          response: latestResponse,
          status: updated.status,
        });
      }
    }

    return apiResponse(res, 200, true, 'Response added', updated);
  } catch (err) {
    next(err);
  }
};

exports.adminGetDraftResponse = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ ticket_id: req.params.ticket_id });
    if (!ticket) return apiResponse(res, 404, false, 'Ticket not found');

    const forceRegenerate = req.query.regenerate === 'true';

    if (ticket.ai_meta?.draft_response && !forceRegenerate) {
      return apiResponse(res, 200, true, 'Draft fetched from cache', {
        draft: ticket.ai_meta.draft_response,
        generated_at: ticket.ai_meta.draft_generated_at,
      });
    }

    const { draft, ai_error } = await generateDraftResponse(ticket);

    // Graceful degradation: if AI is down, tell the admin clearly so they
    // can write manually. The ticket itself is unaffected.
    if (!draft) {
      const msg = ai_error === 'AI_RATE_LIMITED'
        ? 'AI is rate-limited. Please wait a moment and try again.'
        : ai_error === 'AI_KEY_MISSING'
          ? 'AI is not configured (missing API key). Please write a response manually.'
          : 'AI draft generation failed. The AI service may be temporarily unavailable — please write a response manually.';
      return apiResponse(res, 503, false, msg, { ai_error });
    }

    await Ticket.findOneAndUpdate(
      { ticket_id: req.params.ticket_id },
      { 'ai_meta.draft_response': draft, 'ai_meta.draft_generated_at': new Date() }
    );

    return apiResponse(res, 200, true, 'Draft generated', {
      draft,
      generated_at: new Date(),
    });
  } catch (err) {
    next(err);
  }
};

exports.adminGetStats = async (req, res, next) => {
  try {
    const [statusCounts, categoryCounts, priorityCounts] = await Promise.all([
      Ticket.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Ticket.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      Ticket.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
    ]);

    const totalTickets = await Ticket.countDocuments();
    const unresolvedOld = await Ticket.countDocuments({
      status: { $in: ['Open', 'In Progress', 'Resolved', 'Closed'] },
      createdAt: { $lte: new Date(Date.now() - 48 * 60 * 60 * 1000) }, // older than 48h
    });

    return apiResponse(res, 200, true, 'Stats fetched', {
      total: totalTickets,
      unresolved_older_than_48h: unresolvedOld,
      by_status: Object.fromEntries(statusCounts.map((s) => [s._id, s.count])),
      by_category: Object.fromEntries(categoryCounts.map((c) => [c._id, c.count])),
      by_priority: Object.fromEntries(priorityCounts.map((p) => [p._id, p.count])),
    });
  } catch (err) {
    next(err);
  }
};