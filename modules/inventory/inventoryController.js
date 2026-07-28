const catchAsync = require("../../common/utils/catchAsync");
const { sendSuccess } = require("../../common/utils/apiResponse");
const inventoryService = require("./inventoryServices");

const getHistory = catchAsync(async (req, res) => {
  const { data, pagination } = await inventoryService.getProductHistory(req.params.id, req.query);
  sendSuccess(res, 200, data, pagination);
});

module.exports = { getHistory }; 