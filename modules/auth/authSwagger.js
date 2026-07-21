/**
 * @openapi
 * tags:
 *   name: Auth
 *   description: Authentication APIs
 */

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new customer account
 *     description: Registration always creates a CUSTOMER account. Admin and staff accounts are created only via the seed script.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: "Saad" }
 *               email: { type: string, example: "saad@gmail.com" }
 *               password: { type: string, example: "Passw0rd1" }
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 user:
 *                   id: 1
 *                   name: "Saad"
 *                   email: "saad@gmail.com"
 *                   role: "CUSTOMER"
 *                 token: "eyJhbGciOiJIUzI1NiIs..."
 *       400: { description: Validation error }
 *       409: { description: Email already exists }
 */

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: "saad@gmail.com" }
 *               password: { type: string, example: "Passw0rd1" }
 *     responses:
 *       200: { description: Login successful }
 *       400: { description: Missing email or password }
 *       401: { description: Invalid credentials }
 */

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user data }
 *       401: { description: Unauthorized }
 */

module.exports = {};