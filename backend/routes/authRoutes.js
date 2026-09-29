const express = require("express");

const {
  register,
  login,
  resetPassword,
  getMe,
  updateProfile,
  changePassword,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// REGISTER
// =====================================================

router.post("/register", register);

// =====================================================
// LOGIN
// =====================================================

router.post("/login", login);

// =====================================================
// RESET PASSWORD
// =====================================================

router.put("/reset-password", resetPassword);

// =====================================================
// GET CURRENT USER / PROFILE
// =====================================================

router.get("/me", protect, getMe);

// =====================================================
// UPDATE PROFILE
// =====================================================

router.put("/profile", protect, updateProfile);

// =====================================================
// CHANGE PASSWORD
// =====================================================

router.put("/change-password", protect, changePassword);

module.exports = router;