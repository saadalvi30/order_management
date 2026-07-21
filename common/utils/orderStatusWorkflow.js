const STATUS = require("../constants/orderStatus");
const ApiError = require("./apiError");

// Every key = current status, value = array of statuses it's allowed to move to
const VALID_TRANSITIONS = {
  [STATUS.PENDING]: [STATUS.CONFIRMED, STATUS.CANCELLED, STATUS.EXPIRED],
  [STATUS.CONFIRMED]: [STATUS.PROCESSING, STATUS.CANCELLED],
  [STATUS.PROCESSING]: [STATUS.READY],
  [STATUS.READY]: [STATUS.COMPLETED],
  [STATUS.COMPLETED]: [],   // terminal state — no transitions allowed
  [STATUS.CANCELLED]: [],   // terminal state
  [STATUS.EXPIRED]: [],     // terminal state
};

function assertValidTransition(currentStatus, newStatus) {
  const allowed = VALID_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(newStatus)) {
    throw ApiError.badRequest(
      `Invalid status transition: cannot move order from ${currentStatus} to ${newStatus}`
    );
  }
}

module.exports = { VALID_TRANSITIONS, assertValidTransition };