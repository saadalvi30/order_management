/**
 * @openapi
 * tags:
 *   name: Products
 *   description: Product inventory management
 */

/**
 * @openapi
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: Create a new product (admin only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, productCode, price]
 *             properties:
 *               name: { type: string, example: "Wireless Mouse" }
 *               productCode: { type: string, example: "PROD-101" }
 *               description: { type: string, example: "Ergonomic wireless mouse" }
 *               price: { type: number, example: 25.99 }
 *               availableQty: { type: integer, example: 100 }
 *               minStockLevel: { type: integer, example: 10 }
 *               status: { type: string, enum: [ACTIVE, INACTIVE, DISCONTINUED], example: "ACTIVE" }
 *     responses:
 *       201: { description: Product created }
 *       409: { description: Product code already exists }
 *   get:
 *     tags: [Products]
 *     summary: List products with filtering, search & pagination
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Searches by name or product code
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, INACTIVE, DISCONTINUED] }
 *       - in: query
 *         name: lowStock
 *         schema: { type: string, enum: ["true", "false"] }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200: { description: Paginated list of products }
 */

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get a single product by id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Product detail }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Products]
 *     summary: Update product details (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               minStockLevel: { type: integer }
 *               status: { type: string, enum: [ACTIVE, INACTIVE, DISCONTINUED] }
 *     responses:
 *       200: { description: Product updated }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Products]
 *     summary: Soft-delete a product (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Not found }
 */

/**
 * @openapi
 * /products/{id}/stock:
 *   patch:
 *     tags: [Products]
 *     summary: Adjust product stock (admin and staff)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, quantity]
 *             properties:
 *               action: { type: string, enum: [STOCK_ADDED, STOCK_REMOVED, MANUAL_ADJUSTMENT] }
 *               quantity: { type: integer, example: 20 }
 *               reason: { type: string, example: "Restocked from supplier" }
 *     responses:
 *       200: { description: Stock updated }
 *       409: { description: Insufficient stock to remove }
 */

/**
 * @openapi
 * /products/{id}/inventory-history:
 *   get:
 *     tags: [Products]
 *     summary: Get inventory history for a product
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200: { description: Paginated inventory history }
 *       404: { description: Product not found }
 */

module.exports = {};