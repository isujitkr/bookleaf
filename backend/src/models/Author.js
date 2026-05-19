const mongoose = require("mongoose");

const authorSchema = new mongoose.Schema({
  author_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  phone: { type: String, required: true },
  city: { type: String },
  joined_date: { type: Date, default: Date.now },
  books: [{ type: mongoose.Schema.Types.ObjectId, ref: "Book" }],
});

const Author = mongoose.model("Author", authorSchema);

module.exports = Author;