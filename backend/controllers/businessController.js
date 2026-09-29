const Business = require("../models/Business");

// =====================================
// CREATE BUSINESS
// =====================================

const createBusiness = async (req, res) => {
  try {
    const {
      name,
      category,
      description,
      address,
      city,
      phone,
      email,
      averageServiceTime,
    } = req.body;

    if (!name || !category || !address || !city) {
      return res.status(400).json({
        success: false,
        message: "Name, category, address and city are required",
      });
    }

    const business = await Business.create({
      owner: req.user.id,
      name,
      category,
      description,
      address,
      city,
      phone,
      email,
      averageServiceTime,
    });

    res.status(201).json({
      success: true,
      message: "Business created successfully",
      business,
    });
  } catch (error) {
    console.error("Create business error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while creating business",
    });
  }
};

// =====================================
// GET ALL BUSINESSES
// =====================================

const getBusinesses = async (req, res) => {
  try {
    const {
      search = "",
      category = "",
      city = "",
      page = 1,
      limit = 10,
    } = req.query;

    const pageNumber = Math.max(parseInt(page) || 1, 1);

    const limitNumber = Math.min(
      Math.max(parseInt(limit) || 10, 1),
      50
    );

    const filter = {
      isActive: true,
    };

    if (search) {
      filter.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          category: {
            $regex: search,
            $options: "i",
          },
        },
        {
          description: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    if (category) {
      filter.category = {
        $regex: category,
        $options: "i",
      };
    }

    if (city) {
      filter.city = {
        $regex: city,
        $options: "i",
      };
    }

    const total = await Business.countDocuments(filter);

    const businesses = await Business.find(filter)
      .populate("owner", "name email")
      .sort({
        createdAt: -1,
      })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    res.status(200).json({
      success: true,
      count: businesses.length,
      total,
      page: pageNumber,
      pages: Math.ceil(total / limitNumber),
      businesses,
    });
  } catch (error) {
    console.error("Get businesses error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching businesses",
    });
  }
};

// =====================================
// GET SINGLE BUSINESS
// =====================================

const getBusinessById = async (req, res) => {
  try {
    const business = await Business.findOne({
      _id: req.params.id,
      isActive: true,
    }).populate("owner", "name email");

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    res.status(200).json({
      success: true,
      business,
    });
  } catch (error) {
    console.error("Get business error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching business",
    });
  }
};

// =====================================
// GET LOGGED-IN OWNER'S BUSINESS
// =====================================

const getMyBusiness = async (req, res) => {
  try {
    const business = await Business.findOne({
      owner: req.user.id,
      isActive: true,
    }).populate("owner", "name email");

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "No active business found for this owner",
      });
    }

    res.status(200).json({
      success: true,
      business,
    });
  } catch (error) {
    console.error("Get my business error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching your business",
    });
  }
};

// =====================================
// UPDATE BUSINESS
// =====================================

const updateBusiness = async (req, res) => {
  try {
    const business = await Business.findOne({
      _id: req.params.id,
      owner: req.user.id,
      isActive: true,
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found or you are not the owner",
      });
    }

    const allowedFields = [
      "name",
      "category",
      "description",
      "address",
      "city",
      "phone",
      "email",
      "averageServiceTime",
      "isOpen",
      "queueEnabled",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        business[field] = req.body[field];
      }
    });

    await business.save();

    res.status(200).json({
      success: true,
      message: "Business updated successfully",
      business,
    });
  } catch (error) {
    console.error("Update business error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while updating business",
    });
  }
};

// =====================================
// UPDATE BUSINESS STATUS
// =====================================

const updateBusinessStatus = async (req, res) => {
  try {
    const { isOpen, queueEnabled } = req.body;

    if (
      isOpen === undefined &&
      queueEnabled === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "isOpen or queueEnabled is required",
      });
    }

    if (
      isOpen !== undefined &&
      typeof isOpen !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "isOpen must be a boolean value",
      });
    }

    if (
      queueEnabled !== undefined &&
      typeof queueEnabled !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "queueEnabled must be a boolean value",
      });
    }

    const business = await Business.findOne({
      _id: req.params.id,
      isActive: true,
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    if (
      req.user.role === "business_owner" &&
      String(business.owner) !== String(req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this business",
      });
    }

    if (isOpen !== undefined) {
      business.isOpen = isOpen;
    }

    if (queueEnabled !== undefined) {
      business.queueEnabled = queueEnabled;
    }

    await business.save();

    // Socket.IO real-time status update
    const io = req.app.get("io");

    if (io) {
      io.to(`business-${business._id}`).emit(
        "business:status-updated",
        {
          businessId: business._id,
          isOpen: business.isOpen,
          queueEnabled: business.queueEnabled,
        }
      );
    }

    res.status(200).json({
      success: true,
      message: "Business status updated successfully",
      business,
    });
  } catch (error) {
    console.error("Update business status error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while updating business status",
    });
  }
};

// =====================================
// DELETE BUSINESS
// =====================================

const deleteBusiness = async (req, res) => {
  try {
    const business = await Business.findOne({
      _id: req.params.id,
      owner: req.user.id,
      isActive: true,
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found or you are not the owner",
      });
    }

    business.isActive = false;

    await business.save();

    res.status(200).json({
      success: true,
      message: "Business deleted successfully",
    });
  } catch (error) {
    console.error("Delete business error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while deleting business",
    });
  }
};

// =====================================
// EXPORTS
// =====================================

module.exports = {
  createBusiness,
  getBusinesses,
  getBusinessById,
  getMyBusiness,
  updateBusiness,
  updateBusinessStatus,
  deleteBusiness,
};