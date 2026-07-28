const bcrypt = require("bcrypt");
const db = require("../../common/db");
const { signToken } = require("../../common/jwt");
const ApiError = require("../../common/utils/apiError");
const ROLES = require("../../common/constants/role");
const logger = require("../../common/logger");

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

function validateRegisterInput({ name, email, password,phone }) {
  if (!name || name.trim().length < 2) {
    throw ApiError.badRequest("name is required and must be at least 2 characters");
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    throw ApiError.badRequest("a valid email is required");
  }
  if (!password || password.length < 8) {
    throw ApiError.badRequest("password must be at least 8 characters long");
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw ApiError.badRequest("password must contain at least one letter and one number");
  }
    if (phone && !/^\+?[0-9]{10,15}$/.test(phone)) {
    throw ApiError.badRequest("phone must be a valid number, e.g. +923001234567");
  }

}

function validateLoginInput({ email, password }) {
  if (!email || !password) {
    throw ApiError.badRequest("email and password are required");
  }
  
}

function toPublicUser(user) {
  const { password, ...rest } = user;
  return rest;
}
async function register(body) {
  validateRegisterInput(body);
  const { name, email, password,phones } = body;

  const existingResult = await db.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existingResult.rows[0]) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const insertResult = await db.query(
    "INSERT INTO users (name, email, password,phone, role) VALUES ($1, $2, $3, $4) RETURNING *",
    [name, email, hashedPassword,phone, ROLES.CUSTOMER]
  );

  const user = insertResult.rows[0];

  logger.info("User registered", { userId: user.id, role: user.role });

  const token = signToken({ sub: user.id, role: user.role });
  return { user: toPublicUser(user), token };
}

async function login(body) {
  validateLoginInput(body);
  const { email, password } = body;

  const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
  const user = result.rows[0];

  if (!user || !user.isactive || user.deletedat) {
    logger.warn("Login failed: invalid credentials or inactive account", { email });
    throw ApiError.unauthorized("Invalid email or password");
  }

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) {
    logger.warn("Login failed: wrong password", { email });
    throw ApiError.unauthorized("Invalid email or password");
  }

  const token = signToken({ sub: user.id, role: user.role });
  logger.info("User logged in", { userId: user.id, role: user.role });
  return { user: toPublicUser(user), token };
}

async function getProfile(userId) {
  const result = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
  const user = result.rows[0];

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  return toPublicUser(user);
}

module.exports = { register, login, getProfile, toPublicUser };