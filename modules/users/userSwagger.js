/**
 * @openapi
 * tags:
 *   name: Users
 *   description: User management (admin only)
 */

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (admin and staff
 )
 *     description: >
 *       Returns all registered users. Can be filtered by role — useful for
 *       finding available staff members. Only accessible to ADMIN.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [ADMIN, STAFF, CUSTOMER] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated list of users
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: 1
 *                   name: "Admin User"
 *                   email: "admin@test.com"
 *                   role: "ADMIN"
 *                   isactive: true
 *                   createdat: "2026-07-14T06:56:31.000Z"
 *                 - id: 2
 *                   name: "Staff One"
 *                   email: "staff1@test.com"
 *                   role: "STAFF"
 *                   isactive: true
 *                   createdat: "2026-07-14T06:56:31.000Z"
 *               pagination:
 *                 page: 1
 *                 limit: 10
 *                 total: 2
 *                 totalPages: 1
 *       403:
 *         description: Forbidden - admin only
 *   post:
 *     tags: [Users]
 *     summary: Create a new user with any role (admin only)
 *     description: >
 *       Allows an admin to directly create a user account — typically used
 *       to onboard a new STAFF member. Only accessible to ADMIN.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role]
 *             properties:
 *               name: { type: string, example: "Staff Three" }
 *               email: { type: string, example: "staff3@test.com" }
 *               password: { type: string, example: "Passw0rd1" }
 *               role: { type: string, enum: [ADMIN, STAFF, CUSTOMER], example: "STAFF" }
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: 8
 *                 name: "Staff Three"
 *                 email: "staff3@test.com"
 *                 role: "STAFF"
 *                 isactive: true
 *                 createdat: "2026-07-21T10:00:00.000Z"
 *       400:
 *         description: Bad Request - invalid input
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "role must be one of: ADMIN, STAFF, CUSTOMER"
 *       403:
 *         description: Forbidden - admin only
 *       409:
 *         description: Conflict - email already exists
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "An account with this email already exists"
 */


module.exports = {};