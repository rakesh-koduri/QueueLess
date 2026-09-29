const express = require("express");

const {
  getBusinessAnalytics,
} = require("../controllers/analyticsController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// BUSINESS ANALYTICS
// ==========================================
router.get(
  "/business/:businessId",
  protect,
  authorize("business_owner", "admin"),
  getBusinessAnalytics
);

module.exports = router;