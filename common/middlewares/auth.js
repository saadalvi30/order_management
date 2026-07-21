const { verifyToken } = require("../jwt");
const db = require("../db");

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token required",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = verifyToken(token);

    const result = await db.query(
      "SELECT * FROM users WHERE id = $1 AND deletedat IS NULL",
      [decoded.sub]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.isactive) {
      return res.status(401).json({
        success: false,
        message: "This account has been disabled",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = authenticateUser;