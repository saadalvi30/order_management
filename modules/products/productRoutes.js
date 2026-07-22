const express = require("express");
const router = express.Router();

const controller = require("./productController");
const auth = require("../../common/middleWares/auth");
const role = require("../../common/middleWares/role");
const ROLES = require("../../common/constants/role");

router.post("/", auth, role(ROLES.ADMIN,ROLES.STAFF), controller.create);
router.get("/", auth, controller.list);
router.get("/:id", auth, controller.getOne);
router.patch("/:id", auth, role(ROLES.ADMIN,ROLES.STAFF), controller.update);
router.patch("/:id/stock", auth, role(ROLES.ADMIN, ROLES.STAFF), controller.updateStock);
router.delete("/:id", auth, role(ROLES.ADMIN,ROLES.STAFF), controller.remove);

router.get("/:id/inventory-history", auth, require("../inventory/inventoryController").getHistory);
module.exports = router;