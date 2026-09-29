const mongoose = require("mongoose");

const queueSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },

    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    tokenNumber: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "waiting",
        "serving",
        "completed",
        "skipped",
        "cancelled",
      ],
      default: "waiting",
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },

    calledAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    estimatedWaitTime: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

queueSchema.index({
  business: 1,
  service: 1,
  status: 1,
});

queueSchema.index({
  business: 1,
  service: 1,
  tokenNumber: 1,
});

module.exports = mongoose.model("Queue", queueSchema);