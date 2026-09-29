const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },

    name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    duration: {
      type: Number,
      required: true,
      min: 1,
      default: 10,
    },

    price: {
      type: Number,
      min: 0,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Service", serviceSchema);