/**
 * Consistent success-response shape used by every controller.
 */
function sendSuccess(res, statusCode, data, pagination) {
  const body = { success: true, data };
  if (pagination) body.pagination = pagination;
  return res.status(statusCode).json(body);
}

module.exports = { sendSuccess };