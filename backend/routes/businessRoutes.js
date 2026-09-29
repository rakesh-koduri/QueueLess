const express = require("express");

const {
  createBusiness,
  getBusinesses,
  getBusinessById,
  getMyBusiness,
  updateBusiness,
  updateBusinessStatus,
  deleteBusiness,
} = require("../controllers/businessController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================
// PUBLIC ROUTES
// =====================================

// Get all businesses
router.get(
  "/",
  getBusinesses
);

// =====================================
// BUSINESS OWNER ROUTES
// =====================================

// Get logged-in owner's business
router.get(
  "/owner/my-business",
  protect,
  authorize("business_owner", "admin"),
  getMyBusiness
);

// =====================================
// UPDATE BUSINESS STATUS
// =====================================

router.put(
  "/:id/status",
  protect,
  authorize("business_owner", "admin"),
  updateBusinessStatus
);

// =====================================
// GET SINGLE BUSINESS
// =====================================

router.get(
  "/:id",
  getBusinessById
);

// =====================================
// CREATE BUSINESS
// =====================================

router.post(
  "/",
  protect,
  authorize("business_owner", "admin"),
  createBusiness
);

// =====================================
// UPDATE BUSINESS
// =====================================

router.put(
  "/:id",
  protect,
  authorize("business_owner", "admin"),
  updateBusiness
);

// =====================================
// DELETE BUSINESS
// =====================================

router.delete(
  "/:id",
  protect,
  authorize("business_owner", "admin"),
  deleteBusiness
);

module.exports = router;