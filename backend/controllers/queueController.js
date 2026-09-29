const Queue = require("../models/Queue");
const Business = require("../models/Business");
const Service = require("../models/Service");
const Notification = require("../models/Notification");

// =====================================
// SOCKET.IO QUEUE UPDATE HELPER
// =====================================

const emitQueueUpdate = (req, queue) => {
  try {
    const io = req.app.get("io");

    if (!io || !queue) return;

    const businessId =
      queue.business?._id?.toString?.() ||
      queue.business?.toString?.();

    const customerId =
      queue.customer?._id?.toString?.() ||
      queue.customer?.toString?.();

    // Notify business owner
    if (businessId) {
      io.to(`business-${businessId}`).emit(
        "queue:updated",
        queue
      );
    }

    // Notify customer
    if (customerId) {
      io.to(`user-${customerId}`).emit(
        "queue:status-updated",
        queue
      );
    }
  } catch (error) {
    console.error(
      "Socket queue update error:",
      error
    );
  }
};

// =====================================
// CREATE + EMIT NOTIFICATION HELPER
// =====================================

const createAndEmitNotification = async (
  req,
  {
    userId,
    title,
    message,
    type,
    queueId = null,
  }
) => {
  try {
    if (!userId) return null;

    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type,
      queue: queueId,
    });

    const io = req.app.get("io");

    if (io) {
      io.to(`user-${userId}`).emit(
        "notification:new",
        notification
      );
    }

    return notification;
  } catch (error) {
    // Notification failure should NOT break queue functionality
    console.error(
      "Notification create error:",
      error
    );

    return null;
  }
};

// =====================================
// JOIN QUEUE
// =====================================

const joinQueue = async (req, res) => {
  try {
    const { businessId, serviceId } = req.body;

    if (!businessId || !serviceId) {
      return res.status(400).json({
        success: false,
        message: "Business ID and Service ID are required",
      });
    }

    // Check business
    const business = await Business.findOne({
      _id: businessId,
      isActive: true,
      queueEnabled: true,
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found or queue is disabled",
      });
    }

    // Check service
    const service = await Service.findOne({
      _id: serviceId,
      business: businessId,
      isActive: true,
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Prevent duplicate active queue entry
    const existingQueue = await Queue.findOne({
      business: businessId,
      service: serviceId,
      customer: req.user.id,
      status: {
        $in: ["waiting", "serving"],
      },
    });

    if (existingQueue) {
      return res.status(409).json({
        success: false,
        message: "You are already in this queue",
        queue: existingQueue,
      });
    }

    // Find last token
    const lastQueue = await Queue.findOne({
      business: businessId,
      service: serviceId,
    }).sort({ tokenNumber: -1 });

    const tokenNumber = lastQueue
      ? lastQueue.tokenNumber + 1
      : 1;

    // Count waiting customers
    const waitingCount = await Queue.countDocuments({
      business: businessId,
      service: serviceId,
      status: "waiting",
    });

    const estimatedWaitTime =
      waitingCount * service.duration;

    const queue = await Queue.create({
      business: businessId,
      service: serviceId,
      customer: req.user.id,
      tokenNumber,
      estimatedWaitTime,
    });

    const populatedQueue = await Queue.findById(queue._id)
      .populate(
        "business",
        "name category city"
      )
      .populate(
        "service",
        "name duration price"
      )
      .populate(
        "customer",
        "name email"
      );

    // Socket.IO queue update
    emitQueueUpdate(req, populatedQueue);

    // Notification: Queue Joined
    await createAndEmitNotification(req, {
      userId: req.user.id,
      title: "Queue Joined",
      message: `You joined the queue. Token #${populatedQueue.tokenNumber}`,
      type: "queue_joined",
      queueId: populatedQueue._id,
    });

    res.status(201).json({
      success: true,
      message: "Successfully joined the queue",
      queue: populatedQueue,
    });
  } catch (error) {
    console.error(
      "Join queue error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error while joining queue",
    });
  }
};

// =====================================
// GET MY QUEUES
// =====================================

const getMyQueue = async (req, res) => {
  try {
    const queues = await Queue.find({
      customer: req.user.id,
    })
      .populate(
        "business",
        "name category city"
      )
      .populate(
        "service",
        "name duration price"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: queues.length,
      queues,
    });
  } catch (error) {
    console.error(
      "Get my queue error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error while fetching queues",
    });
  }
};

// =====================================
// GET QUEUE STATUS
// =====================================

const getQueueStatus = async (req, res) => {
  try {
    const queue = await Queue.findById(
      req.params.id
    )
      .populate(
        "business",
        "name category city"
      )
      .populate(
        "service",
        "name duration price"
      )
      .populate(
        "customer",
        "name email"
      );

    if (!queue) {
      return res.status(404).json({
        success: false,
        message: "Queue entry not found",
      });
    }

    const peopleAhead =
      await Queue.countDocuments({
        business: queue.business._id,
        service: queue.service._id,
        status: "waiting",
        tokenNumber: {
          $lt: queue.tokenNumber,
        },
      });

    res.status(200).json({
      success: true,
      queue,
      peopleAhead,
      estimatedWaitTime:
        peopleAhead * queue.service.duration,
    });
  } catch (error) {
    console.error(
      "Queue status error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error while fetching queue status",
    });
  }
};

// =====================================
// GET BUSINESS QUEUE
// =====================================

const getBusinessQueue = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { status } = req.query;

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

    // Only business owner or admin
    if (
      req.user.role !== "admin" &&
      business.owner.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to view this queue",
      });
    }

    const filter = {
      business: businessId,
    };

    if (status) {
      filter.status = status;
    } else {
      filter.status = {
        $in: ["waiting", "serving"],
      };
    }

    const queues = await Queue.find(filter)
      .populate(
        "service",
        "name duration price"
      )
      .populate(
        "customer",
        "name email"
      )
      .sort({ tokenNumber: 1 });

    res.status(200).json({
      success: true,
      count: queues.length,
      queues,
    });
  } catch (error) {
    console.error(
      "Get business queue error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while fetching business queue",
    });
  }
};

// =====================================
// CALL NEXT CUSTOMER
// =====================================

const callNextCustomer = async (req, res) => {
  try {
    const { businessId } = req.params;

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

    // Only owner/admin
    if (
      req.user.role !== "admin" &&
      business.owner.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to manage this queue",
      });
    }

    // Check currently serving customer
    const currentlyServing =
      await Queue.findOne({
        business: businessId,
        status: "serving",
      });

    if (currentlyServing) {
      return res.status(409).json({
        success: false,
        message: `Token ${currentlyServing.tokenNumber} is currently being served`,
        queue: currentlyServing,
      });
    }

    // Find next waiting customer
    const nextQueue =
      await Queue.findOne({
        business: businessId,
        status: "waiting",
      }).sort({
        tokenNumber: 1,
      });

    if (!nextQueue) {
      return res.status(404).json({
        success: false,
        message:
          "No customers are waiting in the queue",
      });
    }

    nextQueue.status = "serving";
    nextQueue.calledAt = new Date();

    await nextQueue.save();

    const populatedQueue =
      await Queue.findById(nextQueue._id)
        .populate(
          "business",
          "name category city"
        )
        .populate(
          "service",
          "name duration price"
        )
        .populate(
          "customer",
          "name email"
        );

    // Socket.IO update
    emitQueueUpdate(
      req,
      populatedQueue
    );

    // Notification: Your Turn
    const nextCustomerId =
      populatedQueue.customer?._id ||
      populatedQueue.customer?.id;

    if (nextCustomerId) {
      await createAndEmitNotification(req, {
        userId: nextCustomerId,
        title: "Your Turn",
        message: `Your token #${populatedQueue.tokenNumber} is now being served.`,
        type: "your_turn",
        queueId: populatedQueue._id,
      });
    }

    res.status(200).json({
      success: true,
      message: `Token ${nextQueue.tokenNumber} is now being served`,
      queue: populatedQueue,
    });
  } catch (error) {
    console.error(
      "Call next error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while calling next customer",
    });
  }
};

// =====================================
// COMPLETE CUSTOMER
// =====================================

const completeQueue = async (req, res) => {
  try {
    const { queueId } = req.params;

    const queue =
      await Queue.findById(queueId);

    if (!queue) {
      return res.status(404).json({
        success: false,
        message: "Queue entry not found",
      });
    }

    const business =
      await Business.findById(
        queue.business
      );

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    // Only owner/admin
    if (
      req.user.role !== "admin" &&
      business.owner.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to manage this queue",
      });
    }

    if (queue.status !== "serving") {
      return res.status(400).json({
        success: false,
        message:
          "Only a serving customer can be completed",
      });
    }

    queue.status = "completed";
    queue.completedAt = new Date();

    await queue.save();

    const populatedQueue =
      await Queue.findById(queue._id)
        .populate(
          "business",
          "name category city"
        )
        .populate(
          "service",
          "name duration price"
        )
        .populate(
          "customer",
          "name email"
        );

    // Socket.IO update
    emitQueueUpdate(
      req,
      populatedQueue
    );

    // Notification: Completed
    const customerId =
      populatedQueue.customer?._id ||
      populatedQueue.customer?.id;

    if (customerId) {
      await createAndEmitNotification(req, {
        userId: customerId,
        title: "Service Completed",
        message: `Your service for token #${populatedQueue.tokenNumber} has been completed.`,
        type: "completed",
        queueId: populatedQueue._id,
      });
    }

    res.status(200).json({
      success: true,
      message: `Token ${queue.tokenNumber} completed successfully`,
      queue: populatedQueue,
    });
  } catch (error) {
    console.error(
      "Complete queue error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while completing queue",
    });
  }
};

// =====================================
// SKIP CUSTOMER
// =====================================

const skipQueue = async (req, res) => {
  try {
    const { queueId } = req.params;

    const queue =
      await Queue.findById(queueId);

    if (!queue) {
      return res.status(404).json({
        success: false,
        message: "Queue entry not found",
      });
    }

    const business =
      await Business.findById(
        queue.business
      );

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    // Only owner/admin
    if (
      req.user.role !== "admin" &&
      business.owner.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to manage this queue",
      });
    }

    if (
      !["waiting", "serving"].includes(
        queue.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This customer cannot be skipped",
      });
    }

    queue.status = "skipped";

    await queue.save();

    const populatedQueue =
      await Queue.findById(queue._id)
        .populate(
          "business",
          "name category city"
        )
        .populate(
          "service",
          "name duration price"
        )
        .populate(
          "customer",
          "name email"
        );

    // Socket.IO update
    emitQueueUpdate(
      req,
      populatedQueue
    );

    // Notification: Skipped
    const customerId =
      populatedQueue.customer?._id ||
      populatedQueue.customer?.id;

    if (customerId) {
      await createAndEmitNotification(req, {
        userId: customerId,
        title: "Queue Skipped",
        message: `Your token #${populatedQueue.tokenNumber} was skipped.`,
        type: "skipped",
        queueId: populatedQueue._id,
      });
    }

    res.status(200).json({
      success: true,
      message: `Token ${queue.tokenNumber} skipped successfully`,
      queue: populatedQueue,
    });
  } catch (error) {
    console.error(
      "Skip queue error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while skipping customer",
    });
  }
};

// =====================================
// EXPORTS
// =====================================

module.exports = {
  joinQueue,
  getMyQueue,
  getQueueStatus,
  getBusinessQueue,
  callNextCustomer,
  completeQueue,
  skipQueue,
};