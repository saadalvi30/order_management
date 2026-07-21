const catchAsync = require("../../common/utils/catchAsync");
const { sendSuccess } = require("../../common/utils/apiResponse");
const orderService = require("./orderServices");

const create = catchAsync(async (req, res) => {
  const idempotencyKey = req.headers["idempotency-key"];
  const order = await orderService.createOrder(req.user, req.body, idempotencyKey);
  sendSuccess(res, 201, order);
});

const list = catchAsync(async (req, res) => {
  const { data, pagination } = await orderService.listOrders(req.user, req.query);
  sendSuccess(res, 200, data, pagination);
});

const getOne = catchAsync(async (req, res) => {
  const order = await orderService.getOrderById(req.user, req.params.id);
  sendSuccess(res, 200, order);
});

const confirm = catchAsync(async (req, res) => {
  const order = await orderService.confirmOrder(req.user, req.params.id);
  sendSuccess(res, 200, order);
});

const updateStatus = catchAsync(async (req, res) => {
  const order = await orderService.updateOrderStatus(req.user, req.params.id, req.body.status);
  sendSuccess(res, 200, order);
});

const cancel = catchAsync(async (req, res) => {
  const order = await orderService.cancelOrder(req.user, req.params.id);
  sendSuccess(res, 200, order);
});

module.exports = { create, list, getOne, confirm, updateStatus, cancel };