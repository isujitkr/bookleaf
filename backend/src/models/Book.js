const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    book_id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    isbn: { type: String, required: true, unique: true },
    genre: { type: String, required: true },
    publication_date: { type: Date, required: true },
    status: { type: String },
    mrp: { type: Number, required: true },
    author_royalty_per_copy: { type: Number},
    total_copies_sold: { type: Number},
    total_royalty_earned: { type: Number},
    royalty_paid: { type: Number},
    royalty_pending: { type: Number},
    last_royalty_payout_date: { type: Date},
    print_partner: { type: String },
    available_on: { type: [String] },
});

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;