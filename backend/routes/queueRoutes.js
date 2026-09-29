const express = require("express");

const {
  joinQueue,
  getMyQueue,
  getQueueStatus,
  getBusinessQueue,
  callNextCustomer,
  completeQueue,
  skipQueue,
} = require("../controllers/queueController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================
// CUSTOMER ROUTES
// =====================================

// Join a queue
router.post(
  "/join",
  protect,
  joinQueue
);

// Get logged-in customer's queues
router.get(
  "/my",
  protect,
  getMyQueue
);

// =====================================
// BUSINESS OWNER ROUTES
// =====================================

// Get business queue
router.get(
  "/business/:businessId",
  protect,
  authorize("business_owner", "admin"),
  getBusinessQueue
);

// Call next customer
router.post(
  "/business/:businessId/call-next",
  protect,
  authorize("business_owner", "admin"),
  callNextCustomer
);

// Complete customer
router.put(
  "/:queueId/complete",
  protect,
  authorize("business_owner", "admin"),
  completeQueue
);

// Skip customer
router.put(
  "/:queueId/skip",
  protect,
  authorize("business_owner", "admin"),
  skipQueue
);

// =====================================
// QUEUE STATUS
// =====================================

// Get specific queue status
router.get(
  "/:id",
  protect,
  getQueueStatus
);

module.exports = router;