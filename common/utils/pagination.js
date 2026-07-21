const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function getOffsetLimit(page, limit) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  let safeLimit = parseInt(limit, 10) || DEFAULT_LIMIT;

  if (safeLimit < 1) safeLimit = DEFAULT_LIMIT;
  if (safeLimit > MAX_LIMIT) safeLimit = MAX_LIMIT;

  const offset = (safePage - 1) * safeLimit;

  return { offset, limit: safeLimit };
}

function buildPaginationMeta(page, limit, total) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(parseInt(limit, 10) || DEFAULT_LIMIT, MAX_LIMIT);
  const totalPages = Math.ceil(total / safeLimit) || 1;

  return {
    page: safePage,
    limit: safeLimit,
    total,
    totalPages,
  };
}

module.exports = { getOffsetLimit, buildPaginationMeta };