const Service = require("../models/Service");
const Business = require("../models/Business");

// =====================================
// CREATE SERVICE
// =====================================

const createService = async (req, res) => {
  try {
    const {
      businessId,
      name,
      description,
      duration,
      price,
    } = req.body;

    if (!businessId || !name || !duration) {
      return res.status(400).json({
        success: false,
        message: "Business ID, service name and duration are required",
      });
    }

    // Check business
    const business = await Business.findOne({
      _id: businessId,
      isActive: true,
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    // Only owner/admin can create service
    if (
      req.user.role !== "admin" &&
      business.owner.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to manage this business",
      });
    }

    const service = await Service.create({
      business: businessId,
      name,
      description,
      duration,
      price,
    });

    res.status(201).json({
      success: true,
      message: "Service created successfully",
      service,
    });
  } catch (error) {
    console.error("Create service error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while creating service",
    });
  }
};

// =====================================
// GET SERVICES BY BUSINESS
// =====================================

const getServicesByBusiness = async (req, res) => {
  try {
    const services = await Service.find({
      business: req.params.businessId,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: services.length,
      services,
    });
  } catch (error) {
    console.error("Get services error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching services",
    });
  }
};

// =====================================
// UPDATE SERVICE
// =====================================

const updateService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service || !service.isActive) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const business = await Business.findById(service.business);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    if (
      req.user.role !== "admin" &&
      business.owner.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this service",
      });
    }

    const allowedFields = [
      "name",
      "description",
      "duration",
      "price",
      "isActive",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        service[field] = req.body[field];
      }
    });

    await service.save();

    res.status(200).json({
      success: true,
      message: "Service updated successfully",
      service,
    });
  } catch (error) {
    console.error("Update service error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while updating service",
    });
  }
};

// =====================================
// DELETE SERVICE
// =====================================

const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service || !service.isActive) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const business = await Business.findById(service.business);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    if (
      req.user.role !== "admin" &&
      business.owner.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this service",
      });
    }

    service.isActive = false;

    await service.save();

    res.status(200).json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (error) {
    console.error("Delete service error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while deleting service",
    });
  }
};

module.exports = {
  createService,
  getServicesByBusiness,
  updateService,
  deleteService,
};