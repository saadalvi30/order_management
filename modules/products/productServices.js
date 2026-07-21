const db = require("../../common/db");
const ApiError = require("../../common/utils/apiError");
const PRODUCT_STATUS = require("../../common/constants/productStatus");
const { getOffsetLimit, buildPaginationMeta } = require("../../common/utils/pagination");
const inventoryService = require("../inventory/inventoryServices");
const logger = require("../../common/logger");

function validateCreateInput({ name, productCode, price }) {
  if (!name || name.trim().length < 2) {
    throw ApiError.badRequest("name is required and must be at least 2 characters");
  }
  if (!productCode || productCode.trim().length < 2) {
    throw ApiError.badRequest("productCode is required");
  }
  if (price === undefined || price === null || Number(price) <= 0) {
    throw ApiError.badRequest("price must be greater than zero");
  }
}

function attachLowStockFlag(product) {
  return {
    ...product,
    isLowStock: product.availableqty <= product.minstocklevel,
  };
}

async function createProduct(body) {
  validateCreateInput(body);
  const {
    name,
    productCode,
    description = null,
    price,
    availableQty = 0,
    minStockLevel = 5,
    status = PRODUCT_STATUS.ACTIVE,
  } = body;

  if (availableQty < 0) {
    throw ApiError.badRequest("availableQty cannot be negative");
  }

  const existing = await db.query(
    "SELECT id FROM products WHERE productcode = $1",
    [productCode]
  );
  if (existing.rows[0]) {
    throw ApiError.conflict(`A product with code ${productCode} already exists`);
  }

  const insertResult = await db.query(
    `INSERT INTO products (name, productcode, description, price, availableqty, minstocklevel, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [name, productCode, description, price, availableQty, minStockLevel, status]
  );

  const product = insertResult.rows[0];
  logger.info("Product created", { productId: product.id, productCode });

  return attachLowStockFlag(product);
}

async function getProducts(query) {
  const { page = 1, limit = 10, search, status, lowStock, sort } = query;

  const conditions = ["deletedat IS NULL"];
  const params = [];

  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (search) {
    const p = addParam(`%${search}%`);
    conditions.push(`(name ILIKE ${p} OR productcode ILIKE ${p})`);
  }
  if (status) {
    conditions.push(`status = ${addParam(status)}`);
  }
  if (lowStock === "true") {
    conditions.push("availableqty <= minstocklevel");
  }

  const whereClause = conditions.join(" AND ");
  const order = sort === "asc" ? "ASC" : "DESC";
  const { offset, limit: safeLimit } = getOffsetLimit(page, limit);

  const whereParams = [...params];
  const limitPlaceholder = addParam(safeLimit);
  const offsetPlaceholder = addParam(offset);

  const rowsResult = await db.query(
    `SELECT * FROM products WHERE ${whereClause} ORDER BY createdat ${order} LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
    params
  );

  const countResult = await db.query(
    `SELECT COUNT(*) AS total FROM products WHERE ${whereClause}`,
    whereParams
  );

  const total = Number(countResult.rows[0].total);

  return {
    data: rowsResult.rows.map(attachLowStockFlag),
    pagination: buildPaginationMeta(page, limit, total),
  };
}

async function getProductRaw(id) {
  const result = await db.query(
    "SELECT * FROM products WHERE id = $1 AND deletedat IS NULL",
    [id]
  );
  return result.rows[0];
}

async function getProductById(id) {
  const product = await getProductRaw(id);
  if (!product) throw ApiError.notFound("Product not found");
  return attachLowStockFlag(product);
}

// Admin only — updates descriptive fields, NOT stock quantities directly
async function updateProduct(id, body) {
  const product = await getProductRaw(id);
  if (!product) throw ApiError.notFound("Product not found");

  const name = body.name !== undefined ? body.name : product.name;
  const description = body.description !== undefined ? body.description : product.description;
  const price = body.price !== undefined ? body.price : product.price;
  const minStockLevel = body.minStockLevel !== undefined ? body.minStockLevel : product.minstocklevel;
  const status = body.status !== undefined ? body.status : product.status;

  if (price !== undefined && Number(price) <= 0) {
    throw ApiError.badRequest("price must be greater than zero");
  }
  if (status && !Object.values(PRODUCT_STATUS).includes(status)) {
    throw ApiError.badRequest(`status must be one of: ${Object.values(PRODUCT_STATUS).join(", ")}`);
  }

  const updateResult = await db.query(
    `UPDATE products
     SET name = $1, description = $2, price = $3, minstocklevel = $4, status = $5, updatedat = CURRENT_TIMESTAMP
     WHERE id = $6
     RETURNING *`,
    [name, description, price, minStockLevel, status, id]
  );

  return attachLowStockFlag(updateResult.rows[0]);
}

// Admin (add/remove stock) and Staff (update stock) — creates an inventory_history entry
async function updateStock(id, body, user) {
  const { action, quantity, reason } = body;

  if (!["STOCK_ADDED", "STOCK_REMOVED", "MANUAL_ADJUSTMENT"].includes(action)) {
    throw ApiError.badRequest("action must be one of: STOCK_ADDED, STOCK_REMOVED, MANUAL_ADJUSTMENT");
  }
  if (!quantity || quantity <= 0) {
    throw ApiError.badRequest("quantity must be a positive number");
  }

  const product = await getProductRaw(id);
  if (!product) throw ApiError.notFound("Product not found");

  const previousQty = product.availableqty;
  let newQty;

  if (action === "STOCK_REMOVED") {
    newQty = previousQty - quantity;
    if (newQty < 0) {
      throw ApiError.conflict(`Insufficient stock to remove. Available: ${previousQty}`);
    }
  } else {
    // STOCK_ADDED or MANUAL_ADJUSTMENT (treated as an addition here)
    newQty = previousQty + quantity;
  }

  const updateResult = await db.query(
    "UPDATE products SET availableqty = $1, updatedat = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
    [newQty, id]
  );

  await inventoryService.recordInventoryChange({
    productId: id,
    action,
    previousQty,
    changedQty: quantity,
    newQty,
    orderId: null,
    userId: user.id,
    reason: reason || null,
  });

  logger.info("Stock updated", { productId: id, action, previousQty, newQty, userId: user.id });

  return attachLowStockFlag(updateResult.rows[0]);
}

// Soft delete — never hard-deletes, so order_items references stay intact
async function deleteProduct(id) {
  const product = await getProductRaw(id);
  if (!product) throw ApiError.notFound("Product not found");

  await db.query("UPDATE products SET deletedat = CURRENT_TIMESTAMP WHERE id = $1", [id]);
  logger.info("Product soft-deleted", { productId: id });
}

module.exports = {
  createProduct,
  getProducts,
  getProductRaw,
  getProductById,
  updateProduct,
  updateStock,
  deleteProduct,
};