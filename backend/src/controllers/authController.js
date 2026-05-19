const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Author = require("../models/Author");
const Admin = require("../models/Admin");
const { apiResponse, generateId } = require("../utils/helpers");
const { generateToken } = require("../utils/jwt");

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "None",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
const attachTokenCookie = (res, token) => {
  res.cookie("accessToken", token, COOKIE_OPTIONS);
};

const clearTokenCookie = (res) => {
  res.clearCookie("accessToken");
};

exports.authorRegister = async (req, res, next) => {
  try {
    const { name, email, password, phone, city } = req.body;

    if (!email || !password || !name) {
      return apiResponse(
        res,
        400,
        false,
        "name, email, and password are required",
      );
    }

    const existing = await Author.findOne({ email });
    if (existing) {
      return apiResponse(res, 400, false, "Email already registered");
    }

    const hashed = await bcrypt.hash(password, 10);
    const author = await Author.create({
      author_id: generateId("AUTH"),
      name,
      email,
      password: hashed,
      phone,
      city,
      joined_date: new Date(),
    });

    return apiResponse(res, 201, true, "Author registered successfully", {
      author: {
        author_id: author.author_id,
        name: author.name,
        email: author.email,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.authorLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return apiResponse(res, 400, false, "Email and password are required");
    }

    const author = await Author.findOne({ email }).select("+password");

    if (!author) {
      return apiResponse(res, 401, false, "Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, author.password);

    if (!isMatch) {
      return apiResponse(res, 401, false, "Invalid credentials");
    }

    const token = generateToken({ id: author.author_id, role: "author" });
    attachTokenCookie(res, token);

    return apiResponse(res, 200, true, "Login successful", {
      author: {
        author_id: author.author_id,
        name: author.name,
        email: author.email,
        city: author.city,
        joined_date: author.joined_date,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res, next) => {
  clearTokenCookie(res);
  apiResponse(res, 200, true, "Logged out successfully");
};

exports.adminRegister = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!email || !password || !name) {
      return apiResponse(
        res,
        400,
        false,
        "name, email, and password are required",
      );
    }

    const existing = await Admin.findOne({ email });
    if (existing) {
      return apiResponse(res, 400, false, "Email already registered");
    }

    const hashed = await bcrypt.hash(password, 12);
    const admin = await Admin.create({
      admin_id: generateId("ADM"),
      name,
      email,
      password: hashed,
      role: role || "support_agent",
    });

    return apiResponse(res, 201, true, "Admin registered successfully", {
      admin: {
        admin_id: admin.admin_id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return apiResponse(res, 400, false, "Email and password are required");
    }

    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin) {
      return apiResponse(res, 401, false, "Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return apiResponse(res, 401, false, "Invalid credentials");
    }

    await admin.save();

    const token = generateToken({ id: admin.admin_id, role: admin.role });
    attachTokenCookie(res, token);
    return apiResponse(res, 200, true, "Login successful", {
      admin: {
        admin_id: admin.admin_id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const { id, role } = req.user;
    let user;

    if (role === "author") {
      user = await Author.findOne({ author_id: id }, "-password -__v");
    } else {
      user = await Admin.findOne({ admin_id: id }, "-password -__v");
    }

    if (!user) return apiResponse(res, 404, false, "User not found");
    return apiResponse(res, 200, true, "User fetched", { role, user });
  } catch (err) {
    next(err);
  }
};
