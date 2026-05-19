const Author = require('../models/Author');
const { apiResponse } = require('../utils/helpers');
const Book = require('../models/Book');

exports.getMyBooks = async (req, res, next) => {
  try {
    const author = req.author;
    const books = await Book.find({
      _id: { $in: author.books }
    });
    return apiResponse(res, 200, true, 'Books fetched successfully', {
      author_id: author.author_id,
      name: author.name,
      books,
    });
  } catch (err) {
    next(err);
  }
};

exports.getBookById = async (req, res, next) => {
  try {
    const { book_id } = req.params;

    const isBookOwned = req.author.books.some(
      (id) => id.toString() === book_id
    );

    if (!isBookOwned) {
      return apiResponse(res, 404, false, 'Book not found');
    }

    const book = await Book.findById(book_id);

    if (!book) {
      return apiResponse(res, 404, false, 'Book not found');
    }

    return apiResponse(
      res,
      200,
      true,
      'Book fetched successfully',
      book
    );
  } catch (err) {
    next(err);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const author = req.author;
    return apiResponse(res, 200, true, 'Profile fetched', {
      author_id: author.author_id,
      name: author.name,
      email: author.email,
      phone: author.phone,
      city: author.city,
      joined_date: author.joined_date,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['phone', 'city', 'name'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const author = await Author.findOneAndUpdate(
      { author_id: req.author.author_id },
      { $set: updates },
      { new: true }
    );

    return apiResponse(res, 200, true, 'Profile updated', {
      phone: author.phone,
      city: author.city,
      name: author.name,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllAuthors = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { author_id: { $regex: search, $options: 'i' } },
      ];
    }

    const [authors, total] = await Promise.all([
      Author.find(filter).select('-password').skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Author.countDocuments(filter),
    ]);

    return apiResponse(
      res,
      200,
      true,
      'Authors fetched',
      authors,
      { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
    );
  } catch (err) {
    next(err);
  }
};

exports.getAuthorById = async (req, res, next) => {
  try {
    const author = await Author.findOne({ author_id: req.params.author_id }).select('-password').populate('books');
    if (!author) return apiResponse(res, 404, false, 'Author not found');
    return apiResponse(res, 200, true, 'Author fetched', author);
  } catch (err) {
    next(err);
  }
};