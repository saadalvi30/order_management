/**
 * @openapi
 * tags:
 *   name: Orders
 *   description: Order creation, fulfilment, and cancellation
 */

/**
 * @openapi
 * /orders:
 *   post:
 *     tags: [Orders]
 *     summary: Create an order (customer only) — reserves stock atomically
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: false
 *         schema: { type: string }
 *         example: "a1b2c3-unique-request-id"
 *         description: Prevents duplicate order creation on repeated submission
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId: { type: integer, example: 1 }
 *                     quantity: { type: integer, example: 2 }
 *     responses:
 *       201: { description: Order created, stock reserved }
 *       404: { description: Product not found }
 *       409: { description: Insufficient stock or product not active }
 *   get:
 *     tags: [Orders]
 *     summary: List orders (scoped by role) with filtering & pagination
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, CONFIRMED, PROCESSING, READY, COMPLETED, CANCELLED, EXPIRED] }
 *       - in: query
 *         name: customerId
 *         schema: { type: integer }
 *       - in: query
 *         name: orderNumber
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200: { description: Paginated list of orders }
 */

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get a single order with its items
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Order detail with items }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */

/**
 * @openapi
 * /orders/{id}/confirm:
 *   patch:
 *     tags: [Orders]
 *     summary: Confirm a pending order
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Order confirmed }
 *       400: { description: Invalid status transition }
 */

/**
 * @openapi
 * /orders/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Move an order through fulfilment stages (admin/staff only)
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [PROCESSING, READY, COMPLETED] }
 *     responses:
 *       200: { description: Status updated }
 *       400: { description: Invalid status transition }
 */

/**
 * @openapi
 * /orders/{id}/cancel:
 *   patch:
 *     tags: [Orders]
 *     summary: Cancel an eligible order — restores reserved stock
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Order cancelled, stock restored }
 *       400: { description: Order cannot be cancelled in its current status }
 */

/**
 * @openapi
 * /orders/{id}/activities:
 *   get:
 *     tags: [Orders]
 *     summary: Get an order's activity/audit history
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Activity history }
 *       403: { description: Forbidden }
 */

module.exports = {};