const catchAsync = require("../../common/utils/catchAsync");
const { sendSuccess } = require("../../common/utils/apiResponse");
const service = require("./authServices");

const register = catchAsync(async (req, res) => {
  const result = await service.register(req.body);
  sendSuccess(res, 201, result);
});

const login = catchAsync(async (req, res) => {
  const result = await service.login(req.body);
  sendSuccess(res, 200, result);
});

const getMe = catchAsync(async (req, res) => {
  const user = await service.getProfile(req.user.id);
  sendSuccess(res, 200, user);
});

module.exports = { register, login, getMe };