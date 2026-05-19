const mongoose = require('mongoose');

const ResponseSchema = new mongoose.Schema(
  {
    sent_by: {
      type: String,
      enum: ['author', 'admin'],
      required: true,
    },
    sender_id: { type: String, required: true },
    sender_name: { type: String, required: true },
    message: { type: String, required: true },
    is_internal_note: { type: Boolean, default: false },
    attachment_url: { type: String, default: null },
  },
  { timestamps: true }
);

const AIMetaSchema = new mongoose.Schema(
  {
    suggested_category: { type: String },
    category_confidence: { type: Number, min: 0, max: 1 },
    category_overridden_by: { type: String, default: null }, 

    suggested_priority: { type: String },
    priority_reasoning: { type: String },
    priority_overridden_by: { type: String, default: null },

    classification_error: { type: String, default: null },

    draft_response: { type: String, default: null },
    draft_generated_at: { type: Date, default: null },
  },
  { _id: false }
);

const TicketSchema = new mongoose.Schema(
  {
    ticket_id: { type: String, required: true, unique: true },
    author_id: { type: String, required: true, index: true },
    author_name: { type: String, required: true },
    author_email: { type: String, required: true },
    book_id: { type: String, default: null },
    book_title: { type: String, default: null },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    attachment_url: { type: String, default: null },

    category: {
      type: String,
      enum: [
        'Royalty & Payments',
        'ISBN & Metadata Issues',
        'Printing & Quality',
        'Distribution & Availability',
        'Book Status & Production Updates',
        'General Inquiry',
      ],
      default: 'General Inquiry',
    },

    priority: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open',
    },
    assigned_to: { type: String, default: null },
    assigned_to_name: { type: String, default: null },
    assigned_at: { type: Date, default: null },
    responses: [ResponseSchema],
    ai_meta: { type: AIMetaSchema, default: () => ({}) },
    first_response_at: { type: Date, default: null },
    resolved_at: { type: Date, default: null },
    closed_at: { type: Date, default: null },
  },
  { timestamps: true }
);
TicketSchema.index({ status: 1, priority: 1, createdAt: 1 });
TicketSchema.index({ category: 1 });
TicketSchema.index({ assigned_to: 1 });

module.exports = mongoose.model('Ticket', TicketSchema);