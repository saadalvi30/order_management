const catchAsync = require("../../common/utils/catchAsync");
const { sendSuccess } = require("../../common/utils/apiResponse");
const productService = require("./productServices");

const create = catchAsync(async (req, res) => {
  const product = await productService.createProduct(req.body);
  sendSuccess(res, 201, product);
});

const list = catchAsync(async (req, res) => {
  const { data, pagination } = await productService.getProducts(req.query);
  sendSuccess(res, 200, data, pagination);
});

const getOne = catchAsync(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  sendSuccess(res, 200, product);
});

const update = catchAsync(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  sendSuccess(res, 200, product);
});

const updateStock = catchAsync(async (req, res) => {
  const product = await productService.updateStock(req.params.id, req.body, req.user);
  sendSuccess(res, 200, product);
});

const remove = catchAsync(async (req, res) => {
  await productService.deleteProduct(req.params.id);
  res.status(204).send();
});

module.exports = { create, list, getOne, update, updateStock, remove };