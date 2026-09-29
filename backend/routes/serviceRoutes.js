const express = require("express");

const {
  createService,
  getServicesByBusiness,
  updateService,
  deleteService,
} = require("../controllers/serviceController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================
// GET SERVICES
// =====================================

router.get(
  "/business/:businessId",
  getServicesByBusiness
);

// =====================================
// CREATE SERVICE
// =====================================

router.post(
  "/",
  protect,
  authorize("business_owner", "admin"),
  createService
);

// =====================================
// UPDATE SERVICE
// =====================================

router.put(
  "/:id",
  protect,
  authorize("business_owner", "admin"),
  updateService
);

// =====================================
// DELETE SERVICE
// =====================================

router.delete(
  "/:id",
  protect,
  authorize("business_owner", "admin"),
  deleteService
);

module.exports = router;