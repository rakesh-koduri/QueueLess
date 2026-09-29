const express = require("express");

const {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} = require("../controllers/notificationController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Get notifications
router.get("/", protect, getMyNotifications);

// Mark all notifications as read
router.put("/read-all", protect, markAllNotificationsAsRead);

// Mark one notification as read
router.put("/:id/read", protect, markNotificationAsRead);

// Delete one notification
router.delete("/:id", protect, deleteNotification);

module.exports = router;