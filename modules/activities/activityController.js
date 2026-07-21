const catchAsync = require("../../common/utils/catchAsync");
const { sendSuccess } = require("../../common/utils/apiResponse");
const activityService = require("./activityServices");

const getActivities = catchAsync(async (req, res) => {
  const activities = await activityService.getOrderActivities(req.user, req.params.id);
  sendSuccess(res, 200, activities);
});

module.exports = { getActivities };