const bcrypt = require("bcrypt");
const db = require("../../common/db");
const ApiError = require("../../common/utils/apiError");
const ROLES = require("../../common/constants/role");
const { getOffsetLimit, buildPaginationMeta } = require("../../common/utils/pagination");

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
const ALLOWED_ROLES = [ROLES.ADMIN, ROLES.STAFF, ROLES.CUSTOMER];

async function getUsers(query) {
  const { page = 1, limit = 10, role } = query;

  const conditions = ["deletedat IS NULL"];
  const params = [];

  if (role) {
    params.push(role);
    conditions.push(`role = $${params.length}`);
  }

  const whereClause = conditions.join(" AND ");
  const { offset, limit: safeLimit } = getOffsetLimit(page, limit);

  const whereParams = [...params];
  params.push(safeLimit);
  const limitPlaceholder = `$${params.length}`;
  params.push(offset);
  const offsetPlaceholder = `$${params.length}`;

  const rowsResult = await db.query(
    `SELECT id, name, email, role, isactive, createdat
     FROM users
     WHERE ${whereClause}
     ORDER BY createdat DESC
     LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
    params
  );

  const countResult = await db.query(
    `SELECT COUNT(*) AS total FROM users WHERE ${whereClause}`,
    whereParams
  );

  const total = Number(countResult.rows[0].total);

  return {
    data: rowsResult.rows,
    pagination: buildPaginationMeta(page, limit, total),
  };
}


function validateCreateUserInput({ name, email, password, role }) {
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
  if (!role || !ALLOWED_ROLES.includes(role)) {
    throw ApiError.badRequest(`role must be one of: ${ALLOWED_ROLES.join(", ")}`);
  }
}

async function createUser(body) {
  validateCreateUserInput(body);
  const { name, email, password, role } = body;

  const existingResult = await db.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existingResult.rows[0]) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const insertResult = await db.query(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, isactive, createdat`,
    [name, email, hashedPassword, role]
  );

  return insertResult.rows[0];
}

module.exports = { getUsers,  createUser };