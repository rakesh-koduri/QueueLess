const Queue = require("../models/Queue");
const Business = require("../models/Business");

// ==========================================
// BUSINESS ANALYTICS
// ==========================================
const getBusinessAnalytics = async (req, res) => {
  try {
    const { businessId } = req.params;

    // ------------------------------------------
    // CHECK BUSINESS
    // ------------------------------------------
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

    // ------------------------------------------
    // OWNER / ADMIN AUTHORIZATION
    // ------------------------------------------
    if (
      req.user.role !== "admin" &&
      business.owner.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view analytics",
      });
    }

    // ------------------------------------------
    // TODAY RANGE
    // ------------------------------------------
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // ------------------------------------------
    // GET TODAY'S QUEUES
    // ------------------------------------------
    const todayQueues = await Queue.find({
      business: businessId,
      createdAt: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    })
      .populate("service", "name duration price")
      .populate("customer", "name email")
      .sort({ createdAt: 1 });

    // ------------------------------------------
    // BASIC COUNTS
    // ------------------------------------------
    const totalCustomers = new Set(
      todayQueues
        .map((queue) => queue.customer?._id?.toString())
        .filter(Boolean)
    ).size;

    const totalQueueEntries = todayQueues.length;

    const waitingToday = todayQueues.filter(
      (queue) => queue.status === "waiting"
    ).length;

    const servingToday = todayQueues.filter(
      (queue) => queue.status === "serving"
    ).length;

    const completedToday = todayQueues.filter(
      (queue) => queue.status === "completed"
    ).length;

    const skippedToday = todayQueues.filter(
      (queue) => queue.status === "skipped"
    ).length;

    // ------------------------------------------
    // CURRENT ACTIVE QUEUE
    // ------------------------------------------
    const currentWaiting = await Queue.countDocuments({
      business: businessId,
      status: "waiting",
    });

    const currentServing = await Queue.countDocuments({
      business: businessId,
      status: "serving",
    });

    // ------------------------------------------
    // AVERAGE WAITING TIME
    // createdAt → calledAt
    // ------------------------------------------
    const queuesWithCallTime = todayQueues.filter(
      (queue) =>
        queue.createdAt &&
        queue.calledAt
    );

    let averageWaitingTime = 0;

    if (queuesWithCallTime.length > 0) {
      const totalWaitingMilliseconds =
        queuesWithCallTime.reduce((total, queue) => {
          return (
            total +
            (new Date(queue.calledAt).getTime() -
              new Date(queue.createdAt).getTime())
          );
        }, 0);

      averageWaitingTime =
        totalWaitingMilliseconds /
        queuesWithCallTime.length /
        60000;
    }

    // ------------------------------------------
    // AVERAGE SERVICE TIME
    // calledAt → completedAt
    // ------------------------------------------
    const completedWithTimes = todayQueues.filter(
      (queue) =>
        queue.calledAt &&
        queue.completedAt &&
        queue.status === "completed"
    );

    let averageServiceTime = 0;

    if (completedWithTimes.length > 0) {
      const totalServiceMilliseconds =
        completedWithTimes.reduce((total, queue) => {
          return (
            total +
            (new Date(queue.completedAt).getTime() -
              new Date(queue.calledAt).getTime())
          );
        }, 0);

      averageServiceTime =
        totalServiceMilliseconds /
        completedWithTimes.length /
        60000;
    }

    // ------------------------------------------
    // SERVICE BREAKDOWN
    // ------------------------------------------
    const serviceMap = {};

    todayQueues.forEach((queue) => {
      const serviceName =
        queue.service?.name || "Unknown Service";

      if (!serviceMap[serviceName]) {
        serviceMap[serviceName] = {
          serviceName,
          total: 0,
          waiting: 0,
          serving: 0,
          completed: 0,
          skipped: 0,
        };
      }

      serviceMap[serviceName].total += 1;

      if (queue.status === "waiting") {
        serviceMap[serviceName].waiting += 1;
      }

      if (queue.status === "serving") {
        serviceMap[serviceName].serving += 1;
      }

      if (queue.status === "completed") {
        serviceMap[serviceName].completed += 1;
      }

      if (queue.status === "skipped") {
        serviceMap[serviceName].skipped += 1;
      }
    });

    const serviceBreakdown = Object.values(serviceMap);

    // ------------------------------------------
    // HOURLY ACTIVITY
    // ------------------------------------------
    const hourlyActivity = Array.from(
      { length: 24 },
      (_, hour) => ({
        hour,
        customers: 0,
      })
    );

    todayQueues.forEach((queue) => {
      const hour = new Date(queue.createdAt).getHours();

      if (hour >= 0 && hour <= 23) {
        hourlyActivity[hour].customers += 1;
      }
    });

    // ------------------------------------------
    // RESPONSE
    // ------------------------------------------
    res.status(200).json({
      success: true,

      business: {
        id: business._id,
        name: business.name,
        category: business.category,
        city: business.city,
      },

      date: startOfToday.toISOString().split("T")[0],

      summary: {
        totalCustomers,
        totalQueueEntries,
        waitingToday,
        servingToday,
        completedToday,
        skippedToday,
      },

      currentQueue: {
        waiting: currentWaiting,
        serving: currentServing,
        active: currentWaiting + currentServing,
      },

      performance: {
        averageWaitingTime: Number(
          averageWaitingTime.toFixed(1)
        ),
        averageServiceTime: Number(
          averageServiceTime.toFixed(1)
        ),
      },

      serviceBreakdown,

      hourlyActivity,
    });
  } catch (error) {
    console.error("Business analytics error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching business analytics",
    });
  }
};

module.exports = {
  getBusinessAnalytics,
};