const express = require("express");

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Any logged-in user
router.get("/protected", protect, (req, res) => {
  res.json({
    success: true,
    message: "You accessed a protected route",
    user: req.user,
  });
});

// Only admin
router.get("/admin-only", protect, authorize("admin"), (req, res) => {
  res.json({
    success: true,
    message: "Welcome Admin",
    user: req.user,
  });
});

module.exports = router;