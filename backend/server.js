const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");

// Routes
const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");
const businessRoutes = require("./routes/businessRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const queueRoutes = require("./routes/queueRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");


dotenv.config();

// =====================================
// DATABASE
// =====================================

connectDB();

// =====================================
// EXPRESS APP
// =====================================

const app = express();

// =====================================
// HTTP SERVER
// =====================================

const server = http.createServer(app);

// =====================================
// SOCKET.IO
// =====================================

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Make Socket.IO available to controllers
app.set("io", io);

// =====================================
// SOCKET CONNECTION
// =====================================

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Customer joins personal room
  socket.on("join-user-room", (userId) => {
    if (!userId) return;

    socket.join(`user-${userId}`);

    console.log(`User joined room: user-${userId}`);
  });

  // Business owner joins business room
  socket.on("join-business-room", (businessId) => {
    if (!businessId) return;

    socket.join(`business-${businessId}`);

    console.log(`Business joined room: business-${businessId}`);
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// =====================================
// MIDDLEWARE
// =====================================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// =====================================
// ROUTES
// =====================================

app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/queues", queueRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);


// =====================================
// HEALTH CHECK
// =====================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "QueueLess API is running 🚀",
  });
});

// =====================================
// 404 HANDLER
// =====================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// =====================================
// GLOBAL ERROR HANDLER
// =====================================

app.use((err, req, res, next) => {
  console.error("Global error:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// =====================================
// START SERVER
// =====================================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`QueueLess server running on port ${PORT}`);
});