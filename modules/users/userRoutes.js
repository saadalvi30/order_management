const express = require("express");
const router = express.Router();

const controller = require("./userControllers");
const auth = require("../../common/middlewares/auth");
const role = require("../../common/middlewares/role");
const ROLES = require("../../common/constants/role");

router.get("/", auth, role(ROLES.ADMIN,ROLES.STAFF), controller.getUsers);
router.post("/", auth, role(ROLES.ADMIN), controller.createUser);

module.exports = router;