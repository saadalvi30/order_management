const express = require("express");
const router = express.Router();

const controller = require("./authController");
const auth = require("../../common/middlewares/auth");

router.post("/register", controller.register);
router.post("/login", controller.login);
router.get("/me", auth, controller.getMe);

module.exports = router;