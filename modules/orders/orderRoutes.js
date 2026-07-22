const express = require("express");
const router = express.Router();

const controller = require("./orderController");
const auth = require("../../common/middlewares/auth");
const role = require("../../common/middlewares/role");
const ROLES = require("../../common/constants/role");
const activityController = require("../activities/activityController");

router.post("/", auth, role(ROLES.CUSTOMER), controller.create);
router.get("/", auth, controller.list);
router.get("/:id", auth, controller.getOne);
router.patch("/:id/confirm", auth, controller.confirm);
router.patch("/:id/status", auth, role(ROLES.ADMIN, ROLES.STAFF), controller.updateStatus);
router.patch("/:id/cancel", auth, controller.cancel);
router.get("/:id/activities", auth, activityController.getActivities);

module.exports = router;