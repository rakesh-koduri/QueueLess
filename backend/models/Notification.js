const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // User who receives the notification
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Notification title
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // Notification message
    message: {
      type: String,
      required: true,
      trim: true,
    },

    // Notification type
    type: {
      type: String,
      enum: [
        "queue_joined",
        "queue_updated",
        "your_turn",
        "completed",
        "skipped",
        "general",
      ],
      default: "general",
    },

    // Related queue
    queue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Queue",
      default: null,
    },

    // Read / unread status
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Notification", notificationSchema);