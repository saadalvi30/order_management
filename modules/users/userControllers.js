const catchAsync = require("../../common/utils/catchAsync");
const { sendSuccess } = require("../../common/utils/apiResponse");
const userService = require("./userServices");

const getUsers = catchAsync(async (req, res) => {
  const { data, pagination } = await userService.getUsers(req.query);
  sendSuccess(res, 200, data, pagination);
});

const createUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  sendSuccess(res, 201, user);
});

module.exports = { getUsers, createUser };