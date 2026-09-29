
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { QRCodeCanvas } from "qrcode.react";
import "./App.css";

const API_URL = "https://queueless-backend-hwtr.onrender.com/api";

function App() {
  // ==========================================
  // MAIN PAGE
  // ==========================================
  const [page, setPage] = useState(() => {
  const token = localStorage.getItem("token");
  const savedUser = localStorage.getItem("user");

  // No login session → Home page
  if (!token || !savedUser) {
    return "home";
  }

  try {
    const user = JSON.parse(savedUser);

    // Business owner → Business Dashboard
    if (user?.role === "business_owner") {
      return "business-dashboard";
    }

    // Customer → Customer Dashboard
    return "dashboard";
  } catch (error) {
    console.error("Invalid saved user data:", error);

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    return "home";
  }
});

  // ==========================================
  // COMMON STATES
  // ==========================================
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ==========================================
  // AUTH STATES
  // ==========================================
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    role: "customer",
  });

  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // ==========================================
  // FORGOT / RESET PASSWORD STATE
  // ==========================================
  const [forgotData, setForgotData] = useState({
    email: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [resetPasswordMessageType, setResetPasswordMessageType] = useState("");

  // ==========================================
  // BUSINESS / SERVICE STATES
  // ==========================================
  const [businesses, setBusinesses] = useState([]);
  const [services, setServices] = useState([]);

  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  // ==========================================
  // BUSINESS STATUS STATE
  // ==========================================
  const [businessStatusLoading, setBusinessStatusLoading] = useState(false);

  // ==========================================
  // BUSINESS ACCOUNT SETTINGS STATE
  // ==========================================
  const [businessSettingsTab, setBusinessSettingsTab] = useState("profile");

  // ==========================================
  // SERVICE MANAGEMENT STATES
  // ==========================================
  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    duration: "",
    price: "",
  });

  const [editingService, setEditingService] = useState(null);

  // ==========================================
  // QUEUE STATE
  // ==========================================
  const [myQueue, setMyQueue] = useState(null);

  // ==========================================
  // BUSINESS QUEUE MANAGEMENT STATE
  // ==========================================
  const [businessQueueBusiness, setBusinessQueueBusiness] = useState(null);
  const [businessQueue, setBusinessQueue] = useState([]);
  const [queueActionLoading, setQueueActionLoading] = useState(false);

  // ==========================================
  // ANALYTICS STATE
  // ==========================================
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // ==========================================
  // NOTIFICATION STATE
  // ==========================================
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);

  // ==========================================
  // PROFILE STATE
  // ==========================================
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });
  const [profileLoading, setProfileLoading] = useState(false);

  // ==========================================
  // CHANGE PASSWORD STATE
  // ==========================================
  const [changePasswordForm, setChangePasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  // ==========================================
  // QR CODE STATE
  // ==========================================
  const [qrBusiness, setQrBusiness] = useState(null);
  const [showBusinessQr, setShowBusinessQr] = useState(false);
  const qrHandledRef = useRef(false);
  const notificationRef = useRef(null);

  // ==========================================
  // CLOSE NOTIFICATIONS WHEN CLICKING OUTSIDE
  // ==========================================
  useEffect(() => {
    if (!showNotifications) return;

    const handleOutsideNotificationClick = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideNotificationClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideNotificationClick
      );
    };
  }, [showNotifications]);

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  const fetchNotifications = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setNotifications([]);
      setUnreadNotificationCount(0);
      return;
    }

    try {
      setNotificationLoading(true);

      const response = await fetch(
        `${API_URL}/notifications`,
        {
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to fetch notifications"
        );
      }

      setNotifications(data.notifications || []);
      setUnreadNotificationCount(data.unreadCount || 0);
    } catch (error) {
      console.error(
        "Notification fetch error:",
        error
      );
    } finally {
      setNotificationLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const response = await fetch(
        `${API_URL}/notifications/${notificationId}/read`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) return;

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          String(notification._id) === String(notificationId)
            ? { ...notification, isRead: true }
            : notification
        )
      );

      setUnreadNotificationCount((count) =>
        Math.max(0, count - 1)
      );
    } catch (error) {
      console.error(
        "Mark notification read error:",
        error
      );
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (unreadNotificationCount === 0) return;

    try {
      const response = await fetch(
        `${API_URL}/notifications/read-all`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to mark notifications as read"
        );
      }

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );

      setUnreadNotificationCount(0);
    } catch (error) {
      console.error(
        "Mark all notifications read error:",
        error
      );
    }
  };

  // Load saved notifications whenever an authenticated page is active.
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token || ["home", "login", "register"].includes(page)) {
      return;
    }

    fetchNotifications();
  }, [page]);

  // ==========================================
  // NOTIFICATION BELL UI
  // ==========================================
  const NotificationBell = () => {
    const formatNotificationTime = (dateValue) => {
      if (!dateValue) return "";

      const date = new Date(dateValue);
      if (Number.isNaN(date.getTime())) return "";

      return date.toLocaleString([], {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const handleNotificationClick = (notification) => {
      if (!notification.isRead) {
        markNotificationAsRead(notification._id);
      }
    };

    return (
      <div
        ref={notificationRef}
        style={{
          position: "relative",
          display: "inline-flex",
        }}
      >
        <button
          type="button"
          onClick={() =>
            setShowNotifications((current) => !current)
          }
          aria-label="Notifications"
          style={{
            position: "relative",
            width: "42px",
            height: "42px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            cursor: "pointer",
            fontSize: "20px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
          }}
        >
          🔔

          {unreadNotificationCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-5px",
                right: "-5px",
                minWidth: "19px",
                height: "19px",
                padding: "0 5px",
                borderRadius: "999px",
                background: "#ef4444",
                color: "#ffffff",
                fontSize: "11px",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid #ffffff",
              }}
            >
              {unreadNotificationCount > 99
                ? "99+"
                : unreadNotificationCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <div
            style={{
              position: "absolute",
              top: "52px",
              right: 0,
              width: "360px",
              maxWidth: "calc(100vw - 32px)",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              boxShadow: "0 18px 45px rgba(15, 23, 42, 0.16)",
              zIndex: 1000,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 18px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "17px",
                    color: "#0f172a",
                  }}
                >
                  Notifications
                </h3>
                <p
                  style={{
                    margin: "3px 0 0",
                    fontSize: "12px",
                    color: "#64748b",
                  }}
                >
                  {unreadNotificationCount > 0
                    ? `${unreadNotificationCount} unread`
                    : "You're all caught up"}
                </p>
              </div>

              {unreadNotificationCount > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsAsRead}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#4f46e5",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 700,
                    padding: "4px",
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>

            <div
              style={{
                maxHeight: "420px",
                overflowY: "auto",
              }}
            >
              {notificationLoading && notifications.length === 0 ? (
                <div
                  style={{
                    padding: "35px 20px",
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: "14px",
                  }}
                >
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "#64748b",
                  }}
                >
                  <div
                    style={{
                      fontSize: "32px",
                      marginBottom: "8px",
                    }}
                  >
                    🔔
                  </div>
                  <strong
                    style={{
                      display: "block",
                      color: "#334155",
                      marginBottom: "5px",
                    }}
                  >
                    No notifications yet
                  </strong>
                  <span style={{ fontSize: "13px" }}>
                    Queue updates will appear here.
                  </span>
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification._id}
                    type="button"
                    onClick={() =>
                      handleNotificationClick(notification)
                    }
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      borderBottom: "1px solid #f1f5f9",
                      background: notification.isRead
                        ? "#ffffff"
                        : "#f8faff",
                      padding: "15px 18px",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "flex-start",
                      }}
                    >
                      <span
                        style={{
                          width: "34px",
                          height: "34px",
                          flexShrink: 0,
                          borderRadius: "10px",
                          background: notification.isRead
                            ? "#f1f5f9"
                            : "#eef2ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "16px",
                        }}
                      >
                        {notification.type === "your_turn"
                          ? "🎯"
                          : notification.type === "completed"
                          ? "✅"
                          : notification.type === "skipped"
                          ? "⏭️"
                          : "🎟️"}
                      </span>

                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                          }}
                        >
                          <strong
                            style={{
                              fontSize: "14px",
                              color: "#0f172a",
                            }}
                          >
                            {notification.title}
                          </strong>

                          {!notification.isRead && (
                            <span
                              style={{
                                width: "7px",
                                height: "7px",
                                flexShrink: 0,
                                borderRadius: "50%",
                                background: "#4f46e5",
                              }}
                            />
                          )}
                        </span>

                        <span
                          style={{
                            display: "block",
                            marginTop: "4px",
                            fontSize: "13px",
                            lineHeight: 1.45,
                            color: "#475569",
                          }}
                        >
                          {notification.message}
                        </span>

                        <span
                          style={{
                            display: "block",
                            marginTop: "6px",
                            fontSize: "11px",
                            color: "#94a3b8",
                          }}
                        >
                          {formatNotificationTime(
                            notification.createdAt
                          )}
                        </span>
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // SOCKET.IO REAL-TIME QUEUE UPDATES
  // ==========================================
  useEffect(() => {
    console.log("🔥 Socket effect started");

    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (!token || !savedUser) {
      console.log("❌ Socket: token or user not found");
      return;
    }

    let user;

    try {
      user = JSON.parse(savedUser);
    } catch (error) {
      console.error("❌ Socket: invalid saved user:", error);
      return;
    }

    const userId = user?._id || user?.id;

    if (!userId) {
      console.log("❌ Socket: user ID not found");
      return;
    }

    const socket = io("http://localhost:5000", {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("✅ QueueLess Socket connected:", socket.id);
      socket.emit("join-user-room", userId);
      console.log("👤 Joined user room:", userId);

      if (user.role === "business_owner" || user.role === "admin") {
        fetch(`${API_URL}/businesses/owner/my-business`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })
          .then((response) => response.json())
          .then((data) => {
            if (data?.business?._id) {
              socket.emit("join-business-room", data.business._id);
              console.log("🏢 Joined business room:", data.business._id);
            }
          })
          .catch((error) => {
            console.error("❌ Unable to join business socket room:", error);
          });
      }
    });

    socket.on("connect_error", (error) => {
      console.error("❌ QueueLess Socket connection error:", error.message);
    });

    socket.on("notification:new", (newNotification) => {
      console.log("🔔 New notification received:", newNotification);

      if (!newNotification) return;

      setNotifications((currentNotifications) => {
        const alreadyExists = currentNotifications.some(
          (notification) =>
            String(notification._id) === String(newNotification._id)
        );

        if (alreadyExists) {
          return currentNotifications;
        }

        return [newNotification, ...currentNotifications];
      });

      setUnreadNotificationCount((count) => count + 1);
    });

    socket.on("business:status-updated", (updatedBusiness) => {
      console.log("🏢 Business status update received:", updatedBusiness);

      if (!updatedBusiness) return;

      const updatedBusinessId =
        updatedBusiness.businessId || updatedBusiness._id;

      setSelectedBusiness((currentBusiness) => {
        if (
          !currentBusiness ||
          String(currentBusiness._id) !== String(updatedBusinessId)
        ) {
          return currentBusiness;
        }

        return {
          ...currentBusiness,
          isOpen: updatedBusiness.isOpen,
          queueEnabled: updatedBusiness.queueEnabled,
        };
      });

      setBusinessQueueBusiness((currentBusiness) => {
        if (
          !currentBusiness ||
          String(currentBusiness._id) !== String(updatedBusinessId)
        ) {
          return currentBusiness;
        }

        return {
          ...currentBusiness,
          isOpen: updatedBusiness.isOpen,
          queueEnabled: updatedBusiness.queueEnabled,
        };
      });
    });

    socket.on("queue:status-updated", (updatedQueue) => {
      console.log("🔄 Customer queue update received:", updatedQueue);

      if (!updatedQueue) return;

      const updatedQueueCustomerId =
        updatedQueue.customer?._id ||
        updatedQueue.customer?.id ||
        updatedQueue.customer;

      if (String(updatedQueueCustomerId) !== String(userId)) return;

      if (updatedQueue.status === "completed" || updatedQueue.status === "skipped") {
        setMyQueue(null);
        setMessage(
          updatedQueue.status === "completed"
            ? `Token #${updatedQueue.tokenNumber} completed successfully.`
            : `Token #${updatedQueue.tokenNumber} was skipped.`
        );
        return;
      }

      setMyQueue((currentQueue) => ({
        ...(currentQueue || {}),
        ...updatedQueue,
      }));

      if (updatedQueue.status === "serving") {
        setMessage(`Token #${updatedQueue.tokenNumber} is now being served.`);
      }
    });

    socket.on("queue:updated", (updatedQueue) => {
      console.log("🔄 Business queue update received:", updatedQueue);

      if (page === "business-queue") {
        refreshBusinessQueue();
      }
    });

    return () => {
      socket.disconnect();
      console.log("🔌 QueueLess Socket disconnected");
    };
  }, [page]);

  // ==========================================
  // RESET LOGIN FORM
  // ==========================================
  const resetLoginForm = () => {
    setLoginData({
      email: "",
      password: "",
    });

    setShowLoginPassword(false);
    setMessage("");
  };

  // ==========================================
  // RESET REGISTER FORM
  // ==========================================
  const resetRegisterForm = () => {
    setRegisterData({
      name: "",
      email: "",
      password: "",
      role: "customer",
    });

    setShowRegisterPassword(false);
    setMessage("");
  };

  // ==========================================
  // RESET FORGOT PASSWORD FORM
  // ==========================================
  const resetForgotPasswordForm = () => {
    setForgotData({
      email: "",
      newPassword: "",
      confirmPassword: "",
    });

    setShowResetPassword(false);
    setShowResetConfirmPassword(false);
    setResetPasswordMessageType("");
    setMessage("");
  };

  // ==========================================
  // RESET SERVICE FORM
  // ==========================================
  const resetServiceForm = () => {
    setServiceForm({
      name: "",
      description: "",
      duration: "",
      price: "",
    });

    setEditingService(null);
  };

  // ==========================================
  // AUTH HEADERS
  // ==========================================
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");

    return {
      "Content-Type": "application/json",

      ...(token && {
        Authorization: `Bearer ${token}`,
      }),
    };
  };

  // ==========================================
  // LOGIN
  // ==========================================
  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(loginData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Login failed"
        );
      }

      // Save token
      if (data.token) {
        localStorage.setItem(
          "token",
          data.token
        );
      }

      // Save user
      if (data.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );
      }

      // Clear login form
      resetLoginForm();

      // Clear old data
      setMyQueue(null);
      setSelectedBusiness(null);
      setSelectedService(null);
      setServices([]);
      setBusinesses([]);

      setBusinessQueueBusiness(null);
      setBusinessQueue([]);
      setQueueActionLoading(false);

      setAnalytics(null);
      setAnalyticsLoading(false);

      setProfile(null);
      setProfileForm({
        name: "",
        email: "",
      });

      setQrBusiness(null);
      setShowBusinessQr(false);

      resetServiceForm();
      setEditingService(null);

      setNotifications([]);
      setUnreadNotificationCount(0);
      setShowNotifications(false);

      // Go to dashboard based on role
      if (
        data.user?.role ===
        "business_owner"
      ) {
        setPage("business-dashboard");
      } else {
        setPage("dashboard");
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // REGISTER
  // ==========================================
  const handleRegister = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            registerData
          ),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Registration failed"
        );
      }

      resetRegisterForm();

      setMessage(
        "Registration successful! Please login."
      );

      setTimeout(() => {
        setPage("login");
        setMessage("");
      }, 800);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // FORGOT / RESET PASSWORD
  // ==========================================
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!forgotData.email.trim()) {
      setMessage("Please enter your registered email address.");
      setResetPasswordMessageType("error");
      return;
    }

    if (forgotData.newPassword.length < 6) {
      setMessage("New password must be at least 6 characters.");
      setResetPasswordMessageType("error");
      return;
    }

    if (forgotData.newPassword !== forgotData.confirmPassword) {
      setMessage("New password and confirm password do not match.");
      setResetPasswordMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");
    setResetPasswordMessageType("");

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: forgotData.email.trim().toLowerCase(),
          newPassword: forgotData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to reset password");
      }

      setMessage(
        data.message || "Password changed successfully. Please login."
      );
      setResetPasswordMessageType("success");

      const resetEmail = forgotData.email.trim().toLowerCase();

      setForgotData({
        email: resetEmail,
        newPassword: "",
        confirmPassword: "",
      });

      setShowResetPassword(false);
      setShowResetConfirmPassword(false);

      setTimeout(() => {
        resetLoginForm();
        setLoginData({
          email: resetEmail,
          password: "",
        });
        setPage("home");
        setMessage("");
        setResetPasswordMessageType("");
      }, 900);
    } catch (error) {
      setMessage(error.message || "Unable to reset password");
      setResetPasswordMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOGOUT
  // ==========================================
  const logout = () => {
    // Clear authentication/session data.
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Reset the app back to a clean logged-out state.
    setPage("home");

    resetLoginForm();
    resetRegisterForm();

    setBusinesses([]);
    setServices([]);

    setSelectedBusiness(null);
    setSelectedService(null);

    setMyQueue(null);

    setBusinessQueueBusiness(null);
    setBusinessQueue([]);
    setQueueActionLoading(false);

    setAnalytics(null);
    setAnalyticsLoading(false);

    setProfile(null);
    setProfileForm({
      name: "",
      email: "",
    });

    setQrBusiness(null);
    setShowBusinessQr(false);

    resetServiceForm();
    setEditingService(null);

    setNotifications([]);
    setUnreadNotificationCount(0);
    setShowNotifications(false);
    setNotificationLoading(false);

    setChangePasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setChangePasswordLoading(false);

    setForgotData({
      email: "",
      newPassword: "",
      confirmPassword: "",
    });
    setShowResetPassword(false);
    setShowResetConfirmPassword(false);
    setResetPasswordMessageType("");

    setLoading(false);
    setMessage("");

    // Remove authentication-related URL parameters after logout.
    if (window.location.search) {
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }
  };

  // ==========================================
  // SESSION SECURITY
  // ==========================================
  const isTokenExpired = (token) => {
    try {
      if (!token) return true;

      const parts = token.split(".");
      if (parts.length !== 3) return true;

      const payload = JSON.parse(
        atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
      );

      // Tokens without an exp claim are treated as valid.
      if (!payload.exp) return false;

      return payload.exp * 1000 <= Date.now();
    } catch (error) {
      console.error("Session token validation error:", error);
      return true;
    }
  };

  // Check the saved session when the app starts and periodically
  // while the user is using the application.
  useEffect(() => {
    const checkSession = () => {
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      // Nothing to validate while logged out.
      if (!token && !savedUser) return;

      // Missing one side of the session is invalid.
      if (!token || !savedUser || isTokenExpired(token)) {
        logout();
        setMessage("Your session has expired. Please login again.");
      }
    };

    checkSession();

    const sessionInterval = setInterval(
      checkSession,
      30000
    );

    return () => {
      clearInterval(sessionInterval);
    };
  }, []);

  // ==========================================
  // GET BUSINESSES
  // ==========================================
  const fetchBusinesses = async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/businesses`,
        {
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load businesses"
        );
      }

      setBusinesses(
        data.businesses || []
      );

      setPage("businesses");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // GET SERVICES FOR CUSTOMER
  // ==========================================
  const fetchServices = async (
    business
  ) => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/services/business/${business._id}`,
        {
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load services"
        );
      }

      setSelectedBusiness(business);

      setServices(
        data.services || []
      );

      setSelectedService(null);

      setPage("services");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // BUSINESS QR CODE
  // ==========================================
  const openBusinessQr = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `${API_URL}/businesses/owner/my-business`,
        { headers: getAuthHeaders() }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch your business");
      }

      setQrBusiness(data.business);
      setShowBusinessQr(true);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle a business QR URL for a logged-in customer.
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    const qrBusinessId = new URLSearchParams(window.location.search).get(
      "businessId"
    );

    if (qrHandledRef.current || !token || !savedUser || !qrBusinessId) {
      return;
    }

    let user;
    try {
      user = JSON.parse(savedUser);
    } catch (error) {
      return;
    }

    if (user?.role === "business_owner" || user?.role === "admin") {
      qrHandledRef.current = true;
      return;
    }

    const openQrBusiness = async () => {
      try {
        qrHandledRef.current = true;
        setLoading(true);
        setMessage("");

        const businessResponse = await fetch(`${API_URL}/businesses`, {
          headers: getAuthHeaders(),
        });
        const businessData = await businessResponse.json();

        if (!businessResponse.ok) {
          throw new Error(businessData.message || "Failed to load businesses");
        }

        const business = (businessData.businesses || []).find(
          (item) => String(item._id) === String(qrBusinessId)
        );

        if (!business) {
          throw new Error("This QR code is invalid or the business is unavailable.");
        }

        const serviceResponse = await fetch(
          `${API_URL}/services/business/${business._id}`,
          { headers: getAuthHeaders() }
        );
        const serviceData = await serviceResponse.json();

        if (!serviceResponse.ok) {
          throw new Error(
            serviceData.message || "Failed to load business services"
          );
        }

        setSelectedBusiness(business);
        setServices(serviceData.services || []);
        setSelectedService(null);
        setPage("services");
        window.history.replaceState({}, "", window.location.pathname);
      } catch (error) {
        setMessage(error.message);
        window.history.replaceState({}, "", window.location.pathname);
      } finally {
        setLoading(false);
      }
    };

    openQrBusiness();
  }, [page]);

  // ==========================================
  // FIND A BUSINESS
  // ==========================================
  const openFindBusiness = () => {
    setMessage("");
    fetchBusinesses();
  };

  // ==========================================
  // JOIN A QUEUE
  // ==========================================
  const openJoinQueue = () => {
    setMessage("");
    fetchBusinesses();
  };

  // ==========================================
  // SELECT SERVICE FOR JOINING
  // ==========================================
  const selectServiceForQueue = (
    service
  ) => {
    setSelectedService(service);

    setMessage("");

    setPage("join-confirm");
  };

  // ==========================================
  // ACTUAL JOIN QUEUE
  // ==========================================
  const handleJoinQueue = async () => {
    if (
      !selectedBusiness ||
      !selectedService
    ) {
      setMessage(
        "Please select a business and service."
      );

      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/queues/join`,
        {
          method: "POST",
          headers: getAuthHeaders(),

          body: JSON.stringify({
            businessId:
              selectedBusiness._id,

            serviceId:
              selectedService._id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to join queue"
        );
      }

      const queue = data.queue;

      if (!queue) {
        throw new Error(
          "Queue was created but queue data was not returned."
        );
      }

      setMyQueue(queue);

      setMessage(
        "Successfully joined the queue!"
      );

      setPage("my-queue");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // GET MY QUEUE
  // ==========================================
  const fetchMyQueue = async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/queues/my`,
        {
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load your queue"
        );
      }

      const queues =
        data.queues || [];

      const activeQueue =
        queues.find(
          (queue) =>
            queue.status ===
              "waiting" ||
            queue.status ===
              "serving"
        );

      if (!activeQueue) {
        setMyQueue(null);
        setPage("my-queue");
        return;
      }

      const statusResponse =
        await fetch(
          `${API_URL}/queues/${activeQueue._id}`,
          {
            headers:
              getAuthHeaders(),
          }
        );

      const statusData =
        await statusResponse.json();

      if (!statusResponse.ok) {
        setMyQueue(activeQueue);
        setPage("my-queue");
        return;
      }

      const detailedQueue = {
        ...activeQueue,

        ...(statusData.queue || {}),

        peopleAhead:
          statusData.peopleAhead ??
          0,

        estimatedWaitTime:
          statusData.estimatedWaitTime ??
          0,
      };

      setMyQueue(
        detailedQueue
      );

      setPage("my-queue");
    } catch (error) {
      setMessage(error.message);

      setMyQueue(null);

      setPage("my-queue");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // REFRESH CURRENT QUEUE
  // ==========================================
  const refreshCurrentQueue =
    async () => {
      try {
        const response =
          await fetch(
            `${API_URL}/queues/my`,
            {
              headers:
                getAuthHeaders(),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          return;
        }

        const queues =
          data.queues || [];

        const activeQueue =
          queues.find(
            (queue) =>
              queue.status ===
                "waiting" ||
              queue.status ===
                "serving"
          );

        if (!activeQueue) {
          setMyQueue(null);
          return;
        }

        const statusResponse =
          await fetch(
            `${API_URL}/queues/${activeQueue._id}`,
            {
              headers:
                getAuthHeaders(),
            }
          );

        const statusData =
          await statusResponse.json();

        if (!statusResponse.ok) {
          setMyQueue(
            activeQueue
          );

          return;
        }

        setMyQueue({
          ...activeQueue,

          ...(statusData.queue ||
            {}),

          peopleAhead:
            statusData.peopleAhead ??
            0,

          estimatedWaitTime:
            statusData.estimatedWaitTime ??
            0,
        });
      } catch (error) {
        console.error(
          "Queue refresh error:",
          error
        );
      }
    };

  // ==========================================
  // AUTO REFRESH QUEUE
  // ==========================================
  useEffect(() => {
    if (page !== "my-queue") {
      return;
    }

    const token =
      localStorage.getItem(
        "token"
      );

    if (!token) {
      return;
    }

    const interval =
      setInterval(() => {
        refreshCurrentQueue();
      }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [page]);

  // ==========================================
  // PROFILE / ACCOUNT MANAGEMENT
  // ==========================================
  const openProfile = async () => {
    try {
      setProfileLoading(true);
      setMessage("");

      const response = await fetch(`${API_URL}/auth/me`, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch profile");
      }

      setProfile(data.user);
      setProfileForm({
        name: data.user?.name || "",
        email: data.user?.email || "",
      });
      setPage("profile");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      setMessage("Name and email are required.");
      return;
    }

    try {
      setProfileLoading(true);
      setMessage("");

      const response = await fetch(`${API_URL}/auth/profile`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: profileForm.name.trim(),
          email: profileForm.email.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile");
      }

      setProfile(data.user);
      setProfileForm({
        name: data.user?.name || "",
        email: data.user?.email || "",
      });

      localStorage.setItem("user", JSON.stringify({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
      }));

      setMessage("Profile updated successfully.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setProfileLoading(false);
    }
  };

  // ==========================================
  // CHANGE PASSWORD
  // ==========================================
  const handleChangePassword = async (e) => {
    e.preventDefault();

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = changePasswordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage(
        "Current password, new password and confirm password are required."
      );
      return;
    }

    if (newPassword.length < 6) {
      setMessage("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match.");
      return;
    }

    try {
      setChangePasswordLoading(true);
      setMessage("");

      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to change password"
        );
      }

      setChangePasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);

      setMessage("Password changed successfully.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setChangePasswordLoading(false);
    }
  };

  // ==========================================
  // ==========================================
  // BUSINESS QUEUE MANAGEMENT
  // ==========================================
  const openBusinessQueue = async () => {
    try {
      setLoading(true);
      setMessage("");

      const businessResponse = await fetch(
        `${API_URL}/businesses/owner/my-business`,
        {
          headers: getAuthHeaders(),
        }
      );

      const businessData = await businessResponse.json();

      if (!businessResponse.ok) {
        throw new Error(
          businessData.message ||
            "Failed to fetch your business"
        );
      }

      const business = businessData.business;

      if (!business?._id) {
        throw new Error("No active business found for this owner");
      }

      setBusinessQueueBusiness(business);
      setSelectedBusiness(business);

      const queueResponse = await fetch(
        `${API_URL}/queues/business/${business._id}`,
        {
          headers: getAuthHeaders(),
        }
      );

      const queueData = await queueResponse.json();

      if (!queueResponse.ok) {
        throw new Error(
          queueData.message ||
            "Failed to fetch business queue"
        );
      }

      setBusinessQueue(queueData.queues || []);
      setPage("business-queue");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshBusinessQueue = async () => {
    try {
      let business = businessQueueBusiness;

      if (!business?._id) {
        const businessResponse = await fetch(
          `${API_URL}/businesses/owner/my-business`,
          {
            headers: getAuthHeaders(),
          }
        );

        const businessData = await businessResponse.json();

        if (!businessResponse.ok) {
          throw new Error(
            businessData.message ||
              "Failed to fetch your business"
          );
        }

        business = businessData.business;
        setBusinessQueueBusiness(business);
        setSelectedBusiness(business);
      }

      if (!business?._id) {
        return;
      }

      const response = await fetch(
        `${API_URL}/queues/business/${business._id}`,
        {
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to refresh business queue"
        );
      }

      setBusinessQueue(data.queues || []);
    } catch (error) {
      console.error("Business queue refresh error:", error);
    }
  };

  // ==========================================
  // BUSINESS ANALYTICS
  // ==========================================
  const openBusinessAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      setMessage("");

      let business = businessQueueBusiness || selectedBusiness;

      if (!business?._id) {
        const businessResponse = await fetch(
          `${API_URL}/businesses/owner/my-business`,
          {
            headers: getAuthHeaders(),
          }
        );

        const businessData = await businessResponse.json();

        if (!businessResponse.ok) {
          throw new Error(
            businessData.message ||
              "Failed to fetch your business"
          );
        }

        business = businessData.business;
        setSelectedBusiness(business);
        setBusinessQueueBusiness(business);
      }

      if (!business?._id) {
        throw new Error("No active business found for this owner");
      }

      const response = await fetch(
        `${API_URL}/analytics/business/${business._id}`,
        {
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to fetch business analytics"
        );
      }

      setAnalytics(data);
      setPage("business-analytics");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // ==========================================
  // REFRESH ANALYTICS
  // ==========================================
  const refreshBusinessAnalytics = async () => {
    try {
      const business = businessQueueBusiness || selectedBusiness;

      if (!business?._id) return;

      const response = await fetch(
        `${API_URL}/analytics/business/${business._id}`,
        {
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Analytics refresh error:", error);
    }
  };

  // ==========================================
  // AUTO REFRESH ANALYTICS
  // ==========================================
  useEffect(() => {
    if (page !== "business-analytics") return;

    const interval = setInterval(() => {
      refreshBusinessAnalytics();
    }, 10000);

    return () => clearInterval(interval);
  }, [page, businessQueueBusiness, selectedBusiness]);

  // ==========================================
  // BUSINESS QUEUE ACTIONS
  // ==========================================
  const runQueueAction = async (queueId, action) => {
    try {
      setQueueActionLoading(true);
      setMessage("");

      const methods = ["POST", "PUT"];
      let lastMessage = "Queue action failed";
      let completed = false;

      for (const method of methods) {
        const response = await fetch(
          `${API_URL}/queues/${queueId}/${action}`,
          {
            method,
            headers: getAuthHeaders(),
          }
        );

        const data = await response.json();

        if (response.ok) {
          setMessage(data.message || "Queue updated successfully");
          completed = true;
          break;
        }

        lastMessage = data.message || lastMessage;

        // Some backend versions expose complete/skip as PUT instead of POST.
        // Only retry with PUT when POST is not accepted by the route.
        if (response.status !== 404 && response.status !== 405) {
          break;
        }
      }

      if (!completed) {
        throw new Error(lastMessage);
      }

      await refreshBusinessQueue();
      await refreshCurrentQueue();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setQueueActionLoading(false);
    }
  };

  const handleCallNext = async () => {
    const businessId = businessQueueBusiness?._id;

    if (!businessId) {
      setMessage("Business information is not available");
      return;
    }

    try {
      setQueueActionLoading(true);
      setMessage("");

     const response = await fetch(
  `${API_URL}/queues/business/${businessId}/call-next`,
  {
    method: "POST",
    headers: getAuthHeaders(),
  }
);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to call next customer"
        );
      }

      setMessage(data.message || "Next customer called successfully");
      await refreshBusinessQueue();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setQueueActionLoading(false);
    }
  };

  // ==========================================
  // AUTO REFRESH BUSINESS QUEUE
  // ==========================================
  useEffect(() => {
    if (page !== "business-queue") {
      return;
    }

    const interval = setInterval(() => {
      refreshBusinessQueue();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [page, businessQueueBusiness]);

  // ==========================================
  // GET MY BUSINESS
  // ==========================================
  const fetchMyBusiness =
    async () => {
      try {
        setLoading(true);
        setMessage("");

        const response =
          await fetch(
            `${API_URL}/businesses/owner/my-business`,
            {
              headers:
                getAuthHeaders(),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to fetch business"
          );
        }

        setSelectedBusiness(
          data.business
        );

        setPage("business");
      } catch (error) {
        setMessage(error.message);
      } finally {
        setLoading(false);
      }
    };

  // ==========================================
  // UPDATE BUSINESS OPEN / QUEUE STATUS
  // ==========================================
  const updateBusinessStatus = async (changes) => {
    const business = selectedBusiness;

    if (!business?._id) {
      setMessage("Business information not found.");
      return;
    }

    try {
      setBusinessStatusLoading(true);
      setMessage("");

      const response = await fetch(
        `${API_URL}/businesses/${business._id}/status`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(changes),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update business status"
        );
      }

      const updatedBusiness = data.business;

      setSelectedBusiness(updatedBusiness);
      setBusinessQueueBusiness((currentBusiness) =>
        currentBusiness
          ? { ...currentBusiness, ...updatedBusiness }
          : currentBusiness
      );

      setMessage(
        data.message || "Business status updated successfully."
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusinessStatusLoading(false);
    }
  };

  // Load the owner's business status whenever the owner dashboard opens.
  useEffect(() => {
    if (page !== "business-dashboard") return;

    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (!token || !savedUser) return;

    let user;
    try {
      user = JSON.parse(savedUser);
    } catch (error) {
      return;
    }

    if (user?.role !== "business_owner" && user?.role !== "admin") {
      return;
    }

    const loadOwnerBusinessStatus = async () => {
      try {
        const response = await fetch(
          `${API_URL}/businesses/owner/my-business`,
          { headers: getAuthHeaders() }
        );

        const data = await response.json();

        if (response.ok && data.business) {
          setSelectedBusiness(data.business);
          setBusinessQueueBusiness(data.business);
        }
      } catch (error) {
        console.error("Business status load error:", error);
      }
    };

    loadOwnerBusinessStatus();
  }, [page]);

  // ==========================================
  // OPEN BUSINESS SETTINGS
  // ==========================================
  const openBusinessSettings = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `${API_URL}/businesses/owner/my-business`,
        { headers: getAuthHeaders() }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch business settings"
        );
      }

      setSelectedBusiness(data.business);
      setBusinessQueueBusiness(data.business);
      setQrBusiness(data.business);
      setPage("business-settings");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // OPEN BUSINESS ACCOUNT SETTINGS
  // ==========================================
  const openBusinessAccountSettings = async (tab = "profile") => {
    try {
      setLoading(true);
      setMessage("");

      const [profileResponse, businessResponse] = await Promise.all([
        fetch(`${API_URL}/auth/me`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/businesses/owner/my-business`, {
          headers: getAuthHeaders(),
        }),
      ]);

      const profileData = await profileResponse.json();
      const businessData = await businessResponse.json();

      if (!profileResponse.ok) {
        throw new Error(profileData.message || "Failed to fetch profile");
      }

      if (!businessResponse.ok) {
        throw new Error(
          businessData.message || "Failed to fetch business settings"
        );
      }

      setProfile(profileData.user);
      setProfileForm({
        name: profileData.user?.name || "",
        email: profileData.user?.email || "",
      });

      setSelectedBusiness(businessData.business);
      setBusinessQueueBusiness(businessData.business);
      setQrBusiness(businessData.business);
      setBusinessSettingsTab(tab);
      setPage("business-settings");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // OPEN BUSINESS SERVICES
  // ==========================================
  const openBusinessServices =
    async () => {
      try {
        setLoading(true);
        setMessage("");

        const response =
          await fetch(
            `${API_URL}/businesses/owner/my-business`,
            {
              headers:
                getAuthHeaders(),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to fetch business"
          );
        }

        const business =
          data.business;

        setSelectedBusiness(
          business
        );

        const serviceResponse =
          await fetch(
            `${API_URL}/services/business/${business._id}`,
            {
              headers:
                getAuthHeaders(),
            }
          );

        const serviceData =
          await serviceResponse.json();

        if (!serviceResponse.ok) {
          throw new Error(
            serviceData.message ||
              "Failed to fetch services"
          );
        }

        setServices(
          serviceData.services ||
            []
        );

        resetServiceForm();

        setPage(
          "business-services"
        );
      } catch (error) {
        setMessage(error.message);
      } finally {
        setLoading(false);
      }
    };

  // ==========================================
  // CREATE SERVICE
  // ==========================================
  const handleCreateService =
    async (e) => {
      e.preventDefault();

      if (!selectedBusiness) {
        setMessage(
          "Business information not found."
        );

        return;
      }

      if (
        !serviceForm.name.trim()
      ) {
        setMessage(
          "Service name is required."
        );

        return;
      }

      if (
        !serviceForm.duration ||
        Number(serviceForm.duration) <=
          0
      ) {
        setMessage(
          "Please enter a valid duration."
        );

        return;
      }

      setLoading(true);
      setMessage("");

      try {
        const response =
          await fetch(
            `${API_URL}/services`,
            {
              method: "POST",
              headers:
                getAuthHeaders(),

              body: JSON.stringify({
                businessId:
                  selectedBusiness._id,

                name:
                  serviceForm.name.trim(),

                description:
                  serviceForm.description.trim(),

                duration:
                  Number(
                    serviceForm.duration
                  ),

                price:
                  Number(
                    serviceForm.price ||
                      0
                  ),
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to create service"
          );
        }

        setServices(
          (prev) => [
            data.service,
            ...prev,
          ]
        );

        resetServiceForm();

        setMessage(
          "Service created successfully."
        );
      } catch (error) {
        setMessage(
          error.message
        );
      } finally {
        setLoading(false);
      }
    };

  // ==========================================
  // START EDIT SERVICE
  // ==========================================
  const startEditService =
    (service) => {
      setEditingService(
        service
      );

      setServiceForm({
        name:
          service.name || "",

        description:
          service.description ||
          "",

        duration:
          service.duration || "",

        price:
          service.price || "",
      });

      setMessage("");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };

  // ==========================================
  // UPDATE SERVICE
  // ==========================================
  const handleUpdateService =
    async (e) => {
      e.preventDefault();

      if (!editingService) {
        return;
      }

      if (
        !serviceForm.name.trim()
      ) {
        setMessage(
          "Service name is required."
        );

        return;
      }

      setLoading(true);
      setMessage("");

      try {
        const response =
          await fetch(
            `${API_URL}/services/${editingService._id}`,
            {
              method: "PUT",
              headers:
                getAuthHeaders(),

              body: JSON.stringify({
                name:
                  serviceForm.name.trim(),

                description:
                  serviceForm.description.trim(),

                duration:
                  Number(
                    serviceForm.duration
                  ),

                price:
                  Number(
                    serviceForm.price ||
                      0
                  ),
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to update service"
          );
        }

        setServices(
          (prev) =>
            prev.map(
              (service) =>
                service._id ===
                data.service._id
                  ? data.service
                  : service
            )
        );

        resetServiceForm();

        setMessage(
          "Service updated successfully."
        );
      } catch (error) {
        setMessage(
          error.message
        );
      } finally {
        setLoading(false);
      }
    };

  // ==========================================
  // DELETE SERVICE
  // ==========================================
  const handleDeleteService =
    async (serviceId) => {
      const confirmed =
        window.confirm(
          "Are you sure you want to delete this service?"
        );

      if (!confirmed) {
        return;
      }

      setLoading(true);
      setMessage("");

      try {
        const response =
          await fetch(
            `${API_URL}/services/${serviceId}`,
            {
              method: "DELETE",
              headers:
                getAuthHeaders(),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to delete service"
          );
        }

        setServices(
          (prev) =>
            prev.filter(
              (service) =>
                service._id !==
                serviceId
            )
        );

        if (
          editingService?._id ===
          serviceId
        ) {
          resetServiceForm();
        }

        setMessage(
          "Service deleted successfully."
        );
      } catch (error) {
        setMessage(
          error.message
        );
      } finally {
        setLoading(false);
      }
    };

  // ==========================================
  // LOGIN PAGE
  // ==========================================
  if (page === "login") {
    return (
      <div className="auth-page">
        <div className="auth-card">

          <div className="logo">
            QL
          </div>

          <h1>
            Welcome Back
          </h1>

          <p className="auth-subtitle">
            Login to your QueueLess account
          </p>

          {message && (
            <div className="message">
              {message}
            </div>
          )}

          <form
            onSubmit={handleLogin}
          >
            <label>
              Email
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              value={
                loginData.email
              }
              onChange={(e) =>
                setLoginData({
                  ...loginData,
                  email:
                    e.target.value,
                })
              }
              required
            />

            <label>
              Password
            </label>

            <div
              style={{
                position: "relative",
                width: "100%",
              }}
            >
              <input
                type={showLoginPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={
                  loginData.password
                }
                onChange={(e) =>
                  setLoginData({
                    ...loginData,
                    password:
                      e.target.value,
                  })
                }
                required
                style={{
                  width: "100%",
                  paddingRight: "46px",
                  boxSizing: "border-box",
                }}
              />

              <button
                type="button"
                aria-label={
                  showLoginPassword
                    ? "Hide password"
                    : "Show password"
                }
                onClick={() =>
                  setShowLoginPassword((current) => !current)
                }
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  padding: "5px",
                  cursor: "pointer",
                  fontSize: "17px",
                  lineHeight: 1,
                  color: "#64748b",
                }}
              >
                {showLoginPassword ? "🙈" : "👁️"}
              </button>
            </div>

            <button
              type="submit"
              className="primary-btn"
              disabled={loading}
            >
              {loading
                ? "Logging in..."
                : "Login"}
            </button>
          </form>

          <p className="switch-text">
            Don't have an account?

            <button
              className="link-btn"
              onClick={() => {
                resetLoginForm();
                setPage("register");
              }}
            >
              Register
            </button>
          </p>

          <button
            className="back-btn"
            onClick={() => {
              resetLoginForm();
              setPage("home");
            }}
          >
            ← Back to Home
          </button>

        </div>
      </div>
    );
  }

  // ==========================================
  // FORGOT / RESET PASSWORD PAGE
  // ==========================================
  if (page === "forgot-password") {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: "460px" }}>
          <div className="logo">QL</div>

          <h1>Reset Password</h1>

          <p className="auth-subtitle">
            Set a new password for your QueueLess account
          </p>

          {message && (
            <div
              className="message"
              style={{
                color:
                  resetPasswordMessageType === "error"
                    ? "#dc2626"
                    : resetPasswordMessageType === "success"
                    ? "#15803d"
                    : "#344054",
                background:
                  resetPasswordMessageType === "error"
                    ? "#fef2f2"
                    : resetPasswordMessageType === "success"
                    ? "#f0fdf4"
                    : "#f7f8fc",
                border:
                  resetPasswordMessageType === "error"
                    ? "1px solid #fecaca"
                    : resetPasswordMessageType === "success"
                    ? "1px solid #bbf7d0"
                    : "1px solid #dfe3f0",
                marginBottom: "18px",
                fontWeight: 600,
              }}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleResetPassword}>
            <label>Registered Email</label>

            <input
              type="email"
              placeholder="Enter your registered email"
              value={forgotData.email}
              onChange={(e) =>
                setForgotData({
                  ...forgotData,
                  email: e.target.value,
                })
              }
              required
            />

            <label>New Password</label>

            <div
              style={{
                position: "relative",
                width: "100%",
              }}
            >
              <input
                type={showResetPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={forgotData.newPassword}
                onChange={(e) =>
                  setForgotData({
                    ...forgotData,
                    newPassword: e.target.value,
                  })
                }
                minLength={6}
                required
                style={{
                  width: "100%",
                  paddingRight: "46px",
                  boxSizing: "border-box",
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowResetPassword((current) => !current)
                }
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: "4px",
                  fontSize: "17px",
                }}
                aria-label={
                  showResetPassword ? "Hide password" : "Show password"
                }
              >
                {showResetPassword ? "🙈" : "👁️"}
              </button>
            </div>

            <label>Confirm New Password</label>

            <div
              style={{
                position: "relative",
                width: "100%",
              }}
            >
              <input
                type={
                  showResetConfirmPassword ? "text" : "password"
                }
                placeholder="Confirm new password"
                value={forgotData.confirmPassword}
                onChange={(e) =>
                  setForgotData({
                    ...forgotData,
                    confirmPassword: e.target.value,
                  })
                }
                minLength={6}
                required
                style={{
                  width: "100%",
                  paddingRight: "46px",
                  boxSizing: "border-box",
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowResetConfirmPassword((current) => !current)
                }
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: "4px",
                  fontSize: "17px",
                }}
                aria-label={
                  showResetConfirmPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showResetConfirmPassword ? "🙈" : "👁️"}
              </button>
            </div>

            <button
              type="submit"
              className="primary-btn"
              disabled={loading}
            >
              {loading ? "Changing Password..." : "Change Password"}
            </button>
          </form>

          <button
            type="button"
            className="back-btn"
            onClick={() => {
              resetForgotPasswordForm();
              setPage("home");
            }}
          >
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // REGISTER PAGE
  // ==========================================
  if (page === "register") {
    return (
      <div className="auth-page">
        <div className="auth-card">

          <div className="logo">
            QL
          </div>

          <h1>
            Create Account
          </h1>

          <p className="auth-subtitle">
            Join QueueLess today
          </p>

          {message && (
            <div className="message">
              {message}
            </div>
          )}

          <form
            onSubmit={handleRegister}
          >
            <label>
              Full Name
            </label>

            <input
              type="text"
              placeholder="Enter your name"
              value={
                registerData.name
              }
              onChange={(e) =>
                setRegisterData({
                  ...registerData,
                  name:
                    e.target.value,
                })
              }
              required
            />

            <label>
              Email
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              value={
                registerData.email
              }
              onChange={(e) =>
                setRegisterData({
                  ...registerData,
                  email:
                    e.target.value,
                })
              }
              required
            />

            <label>
              Password
            </label>

            <div
              style={{
                position: "relative",
                width: "100%",
              }}
            >
              <input
                type={showRegisterPassword ? "text" : "password"}
                placeholder="Create a password"
                value={
                  registerData.password
                }
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    password:
                      e.target.value,
                  })
                }
                required
                style={{
                  width: "100%",
                  paddingRight: "46px",
                  boxSizing: "border-box",
                }}
              />

              <button
                type="button"
                aria-label={
                  showRegisterPassword
                    ? "Hide password"
                    : "Show password"
                }
                onClick={() =>
                  setShowRegisterPassword((current) => !current)
                }
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  padding: "5px",
                  cursor: "pointer",
                  fontSize: "17px",
                  lineHeight: 1,
                  color: "#64748b",
                }}
              >
                {showRegisterPassword ? "🙈" : "👁️"}
              </button>
            </div>

            <label>
              Account Type
            </label>

            <select
              value={
                registerData.role
              }
              onChange={(e) =>
                setRegisterData({
                  ...registerData,
                  role:
                    e.target.value,
                })
              }
            >
              <option value="customer">
                Customer
              </option>

              <option value="business_owner">
                Business
              </option>
            </select>

            <button
              type="submit"
              className="primary-btn"
              disabled={loading}
            >
              {loading
                ? "Creating..."
                : "Create Account"}
            </button>
          </form>

          <p className="switch-text">
            Already have an account?

            <button
              className="link-btn"
              onClick={() => {
                resetRegisterForm();
                setPage("login");
              }}
            >
              Login
            </button>
          </p>

        </div>
      </div>
    );
  }

  // ==========================================
  // PROFILE PAGE
  // ==========================================
  if (page === "profile") {
    const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const roleLabel =
      profile?.role === "business_owner"
        ? "Business Owner"
        : profile?.role === "admin"
        ? "Admin"
        : profile?.role === "staff"
        ? "Staff"
        : "Customer";

    const passwordFieldStyle = {
      position: "relative",
      width: "100%",
    };

    const passwordInputStyle = {
      width: "100%",
      paddingRight: "46px",
      boxSizing: "border-box",
    };

    const passwordEyeStyle = {
      position: "absolute",
      right: "10px",
      top: "50%",
      transform: "translateY(-50%)",
      border: "none",
      background: "transparent",
      padding: "5px",
      cursor: "pointer",
      fontSize: "17px",
      lineHeight: 1,
      color: "#64748b",
    };

    return (
      <div className="dashboard-page">
        <nav className="navbar">
          <div className="brand">
            <div className="logo small">QL</div>
            <span>QueueLess</span>
          </div>

          <div className="navbar-right">
            <button
              className="back-btn"
              onClick={() =>
                setPage(
                  savedUser?.role === "business_owner"
                    ? "business-dashboard"
                    : "dashboard"
                )
              }
            >
              ← Dashboard
            </button>

            <button className="logout-btn" onClick={logout}>
              Logout
            </button>
          </div>
        </nav>

        <main className="dashboard">
          <div className="welcome-card">
            <span className="welcome-label">Account</span>
            <h1>My Profile</h1>
            <p>
              View and update your QueueLess account information.
            </p>
          </div>

          {message && (
            <div className="message">{message}</div>
          )}

          <div
            className="queue-confirm-card"
            style={{
              maxWidth: "720px",
              margin: "24px auto",
            }}
          >
            <div className="card-icon">👤</div>
            <h2>Account Information</h2>

            <form onSubmit={handleUpdateProfile}>
              <label>Full Name</label>

              <input
                type="text"
                value={profileForm.name}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    name: e.target.value,
                  })
                }
                placeholder="Enter your name"
                required
              />

              <label>Email</label>

              <input
                type="email"
                value={profileForm.email}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    email: e.target.value,
                  })
                }
                placeholder="Enter your email"
                required
              />

              <label>Account Type</label>

              <input
                type="text"
                value={roleLabel}
                readOnly
              />

              <button
                type="submit"
                className="primary-btn"
                disabled={profileLoading}
                style={{ marginTop: "18px" }}
              >
                {profileLoading
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </form>

            <div
              style={{
                marginTop: "18px",
                opacity: 0.75,
              }}
            >
              <p>
                <strong>Member since:</strong>{" "}
                {profile?.createdAt
                  ? new Date(
                      profile.createdAt
                    ).toLocaleDateString()
                  : "—"}
              </p>

              <p>
                <strong>Account status:</strong>{" "}
                {profile?.isActive
                  ? "Active"
                  : "Inactive"}
              </p>
            </div>
          </div>

          {/* CHANGE PASSWORD */}
          <div
            className="queue-confirm-card"
            style={{
              maxWidth: "720px",
              margin: "24px auto",
            }}
          >
            <div className="card-icon">🔐</div>

            <h2>Change Password</h2>

            <p
              style={{
                color: "#64748b",
                marginBottom: "20px",
                lineHeight: 1.5,
              }}
            >
              Update your password to keep your QueueLess
              account secure.
            </p>

            <form onSubmit={handleChangePassword}>
              {/* CURRENT PASSWORD */}
              <label>Current Password</label>

              <div style={passwordFieldStyle}>
                <input
                  type={
                    showCurrentPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    changePasswordForm.currentPassword
                  }
                  onChange={(e) =>
                    setChangePasswordForm({
                      ...changePasswordForm,
                      currentPassword:
                        e.target.value,
                    })
                  }
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                  required
                  style={passwordInputStyle}
                />

                <button
                  type="button"
                  aria-label={
                    showCurrentPassword
                      ? "Hide current password"
                      : "Show current password"
                  }
                  onClick={() =>
                    setShowCurrentPassword(
                      (current) => !current
                    )
                  }
                  style={passwordEyeStyle}
                >
                  {showCurrentPassword
                    ? "🙈"
                    : "👁️"}
                </button>
              </div>

              {/* NEW PASSWORD */}
              <label style={{ marginTop: "16px" }}>
                New Password
              </label>

              <div style={passwordFieldStyle}>
                <input
                  type={
                    showNewPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    changePasswordForm.newPassword
                  }
                  onChange={(e) =>
                    setChangePasswordForm({
                      ...changePasswordForm,
                      newPassword:
                        e.target.value,
                    })
                  }
                  placeholder="Enter your new password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  style={passwordInputStyle}
                />

                <button
                  type="button"
                  aria-label={
                    showNewPassword
                      ? "Hide new password"
                      : "Show new password"
                  }
                  onClick={() =>
                    setShowNewPassword(
                      (current) => !current
                    )
                  }
                  style={passwordEyeStyle}
                >
                  {showNewPassword
                    ? "🙈"
                    : "👁️"}
                </button>
              </div>

              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "12px",
                  color: "#94a3b8",
                }}
              >
                Password must be at least 6 characters.
              </p>

              {/* CONFIRM PASSWORD */}
              <label style={{ marginTop: "16px" }}>
                Confirm New Password
              </label>

              <div style={passwordFieldStyle}>
                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    changePasswordForm.confirmPassword
                  }
                  onChange={(e) =>
                    setChangePasswordForm({
                      ...changePasswordForm,
                      confirmPassword:
                        e.target.value,
                    })
                  }
                  placeholder="Confirm your new password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  style={passwordInputStyle}
                />

                <button
                  type="button"
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  onClick={() =>
                    setShowConfirmPassword(
                      (current) => !current
                    )
                  }
                  style={passwordEyeStyle}
                >
                  {showConfirmPassword
                    ? "🙈"
                    : "👁️"}
                </button>
              </div>

              <button
                type="submit"
                className="primary-btn"
                disabled={changePasswordLoading}
                style={{ marginTop: "20px" }}
              >
                {changePasswordLoading
                  ? "Changing Password..."
                  : "Change Password"}
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // CUSTOMER DASHBOARD
  // ==========================================
  if (page === "dashboard") {
    const user = JSON.parse(
      localStorage.getItem(
        "user"
      ) || "{}"
    );

    return (
      <div className="dashboard-page">

        <nav className="navbar">

          <div className="brand">
            <div className="logo small">
              QL
            </div>

            <span>
              QueueLess
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <NotificationBell />

            <button
              className="secondary-btn"
              onClick={openProfile}
              disabled={profileLoading}
            >
              👤 Profile
            </button>

            <button
              className="logout-btn"
              onClick={logout}
            >
              Logout
            </button>
          </div>

        </nav>

        <main className="dashboard">

          <div className="welcome-card">

            <span className="welcome-label">
              Dashboard
            </span>

            <h1>
              Welcome
              {user.name
                ? `, ${user.name}`
                : ""}!
              👋
            </h1>

            <p>
              Manage your queues and
              appointments with QueueLess.
            </p>

          </div>

          <div className="dashboard-grid">

            {/* FIND BUSINESS */}

            <div className="dashboard-card">

              <div className="card-icon">
                🔍
              </div>

              <h2>
                Find a Business
              </h2>

              <p>
                Search for nearby businesses
                and available services.
              </p>

              <button
                className="secondary-btn"
                onClick={
                  openFindBusiness
                }
                disabled={loading}
              >
                {loading
                  ? "Loading..."
                  : "Explore Businesses"}
              </button>

            </div>

            {/* JOIN QUEUE */}

            <div className="dashboard-card">

              <div className="card-icon">
                🎟️
              </div>

              <h2>
                Join a Queue
              </h2>

              <p>
                Select a service and get
                your digital queue token.
              </p>

              <button
                className="secondary-btn"
                onClick={
                  openJoinQueue
                }
                disabled={loading}
              >
                {loading
                  ? "Loading..."
                  : "Join Queue"}
              </button>

            </div>

            {/* MY QUEUE */}

            <div className="dashboard-card">

              <div className="card-icon">
                📊
              </div>

              <h2>
                My Queue
              </h2>

              <p>
                Track your token and
                estimated waiting time.
              </p>

              <button
                className="secondary-btn"
                onClick={
                  fetchMyQueue
                }
                disabled={loading}
              >
                {loading
                  ? "Loading..."
                  : "View Queue"}
              </button>

            </div>

          </div>

        </main>
      </div>
    );
  }

  // ==========================================
  // BUSINESS OWNER DASHBOARD
  // ==========================================
  if (
    page ===
    "business-dashboard"
  ) {
    const user = JSON.parse(
      localStorage.getItem(
        "user"
      ) || "{}"
    );

    return (
      <div className="dashboard-page">

        <nav className="navbar">

          <div className="brand">

            <div className="logo small">
              QL
            </div>

            <span>
              QueueLess
            </span>

          </div>

          <div className="navbar-right" style={{ gap: "10px" }}>

            <NotificationBell />

            <button
              type="button"
              aria-label="Business Settings"
              title="Business Settings"
              onClick={() => openBusinessAccountSettings("profile")}
              disabled={loading}
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                color: "#4f46e5",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "20px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
                opacity: loading ? 0.65 : 1,
              }}
            >
              ⚙️
            </button>

            <span className="user-role">
              Business Owner
            </span>

            <button
              className="logout-btn"
              onClick={logout}
            >
              Logout
            </button>

          </div>

        </nav>

        <main className="dashboard">

          <div className="welcome-card">

            <span className="welcome-label">
              Business Dashboard
            </span>

            <h1>
              Welcome
              {user.name
                ? `, ${user.name}`
                : ""}!
              👋
            </h1>

            <p>
              Manage your business, services
              and customer queues from here.
            </p>

          </div>

          <div className="dashboard-grid">

            {/* MY BUSINESS */}

            <div className="dashboard-card">

              <div className="card-icon">
                🏢
              </div>

              <h2>
                My Business
              </h2>

              <p>
                View and manage your business
                information.
              </p>

              <button
                className="secondary-btn"
                onClick={
                  fetchMyBusiness
                }
                disabled={loading}
              >
                {loading
                  ? "Loading..."
                  : "Manage Business"}
              </button>

            </div>

            {/* MANAGE SERVICES */}

            <div className="dashboard-card">

              <div className="card-icon">
                🛠️
              </div>

              <h2>
                Manage Services
              </h2>

              <p>
                Add, update and manage the
                services offered by your business.
              </p>

              <button
                className="secondary-btn"
                onClick={
                  openBusinessServices
                }
                disabled={loading}
              >
                {loading
                  ? "Loading..."
                  : "Manage Services"}
              </button>

            </div>

            {/* QUEUE MANAGEMENT */}

            <div className="dashboard-card">

              <div className="card-icon">
                🎟️
              </div>

              <h2>
                Queue Management
              </h2>

              <p>
                View waiting customers and
                manage the current queue.
              </p>

              <button
                className="secondary-btn"
                onClick={
                  openBusinessQueue
                }
              >
                Manage Queue
              </button>

            </div>

            {/* ANALYTICS DASHBOARD */}

            <div className="dashboard-card">

              <div className="card-icon">
                📈
              </div>

              <h2>
                Analytics Dashboard
              </h2>

              <p>
                View today's customer flow, queue performance and service insights.
              </p>

              <button
                className="secondary-btn"
                onClick={openBusinessAnalytics}
                disabled={analyticsLoading}
              >
                {analyticsLoading
                  ? "Loading..."
                  : "View Analytics"}
              </button>

            </div>

            {/* TODAY'S QUEUE */}

            <div className="dashboard-card">

              <div className="card-icon">
                📊
              </div>

              <h2>
                Today's Queue
              </h2>

              <p>
                Monitor today's queue activity
                and customer status.
              </p>

              <button
                className="secondary-btn"
                onClick={
                  openBusinessQueue
                }
              >
                View Queue
              </button>

            </div>

          </div>



        </main>
      </div>
    );
  }

  // ==========================================
  // BUSINESS ACCOUNT SETTINGS PAGE
  // ==========================================
  if (page === "business-settings") {
    const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const roleLabel =
      profile?.role === "business_owner"
        ? "Business Owner"
        : profile?.role === "admin"
        ? "Admin"
        : "Business Owner";

    const passwordFieldStyle = {
      position: "relative",
      width: "100%",
    };

    const passwordInputStyle = {
      width: "100%",
      paddingRight: "46px",
      boxSizing: "border-box",
    };

    const passwordEyeStyle = {
      position: "absolute",
      right: "10px",
      top: "50%",
      transform: "translateY(-50%)",
      border: "none",
      background: "transparent",
      padding: "5px",
      cursor: "pointer",
      fontSize: "17px",
      lineHeight: 1,
      color: "#64748b",
    };

    const settingsNavButtonStyle = (active) => ({
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "12px 14px",
      borderRadius: "10px",
      border: "none",
      background: active ? "#eef2ff" : "transparent",
      color: active ? "#4f46e5" : "#334155",
      fontWeight: active ? 700 : 500,
      cursor: "pointer",
      textAlign: "left",
      fontSize: "14px",
    });

    const settingsPanelStyle = {
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "18px",
      padding: "28px",
      boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
    };

    return (
      <div className="dashboard-page">
        <nav className="navbar">
          <div className="brand">
            <div className="logo small">QL</div>
            <span>QueueLess</span>
          </div>

          <div className="navbar-right" style={{ gap: "10px" }}>
            <NotificationBell />
            <span className="user-role">Business Owner</span>
            <button className="logout-btn" onClick={logout}>
              Logout
            </button>
          </div>
        </nav>

        <main className="dashboard" style={{ maxWidth: "1180px" }}>
          <button
            className="back-btn"
            onClick={() => {
              setMessage("");
              setPage("business-dashboard");
            }}
          >
            ← Business Dashboard
          </button>

          {message && <div className="message">{message}</div>}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "230px minmax(0, 1fr)",
              gap: "28px",
              alignItems: "start",
              marginTop: "20px",
            }}
          >
            {/* SETTINGS SIDEBAR */}
            <aside
              style={{
                ...settingsPanelStyle,
                padding: "18px",
                position: "sticky",
                top: "90px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 10px 18px",
                  borderBottom: "1px solid #e2e8f0",
                  marginBottom: "14px",
                }}
              >
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#eef2ff,#ddd6fe)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                  }}
                >
                  👤
                </div>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {profile?.name || savedUser?.name || "Business Owner"}
                  </strong>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    Business Owner
                  </span>
                </div>
              </div>

              <button
                type="button"
                style={settingsNavButtonStyle(businessSettingsTab === "profile")}
                onClick={() => {
                  setMessage("");
                  setBusinessSettingsTab("profile");
                }}
              >
                <span>👤</span>
                <span>Profile</span>
              </button>

              <button
                type="button"
                style={settingsNavButtonStyle(businessSettingsTab === "status")}
                onClick={() => {
                  setMessage("");
                  setBusinessSettingsTab("status");
                }}
              >
                <span>◉</span>
                <span>Business Status</span>
              </button>

              <button
                type="button"
                style={settingsNavButtonStyle(businessSettingsTab === "qr")}
                onClick={() => {
                  setMessage("");
                  setBusinessSettingsTab("qr");
                }}
              >
                <span>▦</span>
                <span>Business QR Code</span>
              </button>

              <div
                style={{
                  margin: "22px 8px 10px",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  color: "#94a3b8",
                }}
              >
                Other
              </div>

              <button
                type="button"
                style={settingsNavButtonStyle(false)}
                onClick={logout}
              >
                <span>↪</span>
                <span>Logout</span>
              </button>
            </aside>

            {/* SETTINGS CONTENT */}
            <section>
              <div style={{ marginBottom: "20px" }}>
                <h1 style={{ margin: 0, color: "#0f172a", fontSize: "30px" }}>
                  Settings
                </h1>
                <p style={{ margin: "8px 0 0", color: "#64748b" }}>
                  Manage your account and business settings
                </p>
              </div>

              {/* PROFILE */}
              {businessSettingsTab === "profile" && (
                <>
                  {/* ACCOUNT / UPDATE PROFILE */}
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "18px",
                      padding: "28px",
                      boxShadow:
                        "0 10px 30px rgba(15, 23, 42, 0.055)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "20px",
                        paddingBottom: "22px",
                        borderBottom: "1px solid #eef2f7",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                        }}
                      >
                        <div
                          style={{
                            width: "70px",
                            height: "70px",
                            borderRadius: "50%",
                            background:
                              "linear-gradient(135deg,#eef2ff,#ddd6fe)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "32px",
                          }}
                        >
                          👤
                        </div>

                        <div>
                          <h2
                            style={{
                              margin: 0,
                              color: "#0f172a",
                              fontSize: "22px",
                            }}
                          >
                            {profile?.name ||
                              savedUser?.name ||
                              "Business Owner"}
                          </h2>

                          <p
                            style={{
                              margin: "5px 0 0",
                              color: "#64748b",
                              fontSize: "13px",
                            }}
                          >
                            {roleLabel}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => {
                          const input =
                            document.getElementById(
                              "owner-profile-name"
                            );

                          if (input) {
                            input.focus();
                            input.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                          }
                        }}
                      >
                        ✎ Edit Profile
                      </button>
                    </div>

                    {/* CURRENT INFORMATION */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(2,minmax(0,1fr))",
                        gap: "18px",
                        marginTop: "24px",
                      }}
                    >
                      <div
                        style={{
                          padding: "16px",
                          borderRadius: "13px",
                          background: "#f8fafc",
                          border: "1px solid #edf2f7",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "10px",
                            fontWeight: 800,
                            letterSpacing: "0.8px",
                            color: "#94a3b8",
                          }}
                        >
                          NAME
                        </div>
                        <div
                          style={{
                            marginTop: "7px",
                            color: "#0f172a",
                            fontWeight: 650,
                          }}
                        >
                          {profile?.name || "—"}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: "16px",
                          borderRadius: "13px",
                          background: "#f8fafc",
                          border: "1px solid #edf2f7",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "10px",
                            fontWeight: 800,
                            letterSpacing: "0.8px",
                            color: "#94a3b8",
                          }}
                        >
                          EMAIL
                        </div>
                        <div
                          style={{
                            marginTop: "7px",
                            color: "#0f172a",
                            fontWeight: 650,
                            wordBreak: "break-word",
                          }}
                        >
                          {profile?.email || "—"}
                        </div>
                      </div>
                    </div>

                    {/* EDITABLE FIELDS */}
                    <div
                      style={{
                        marginTop: "26px",
                        paddingTop: "25px",
                        borderTop: "1px solid #eef2f7",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          color: "#0f172a",
                          fontSize: "18px",
                        }}
                      >
                        Update Profile
                      </h3>

                      <p
                        style={{
                          margin: "6px 0 20px",
                          color: "#64748b",
                          fontSize: "13px",
                          lineHeight: 1.5,
                        }}
                      >
                        Change your name or email address and save the
                        updated account information.
                      </p>

                      <form onSubmit={handleUpdateProfile}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(2,minmax(0,1fr))",
                            gap: "18px",
                          }}
                        >
                          <div>
                            <label
                              htmlFor="owner-profile-name"
                              style={{
                                display: "block",
                                marginBottom: "7px",
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "#475569",
                              }}
                            >
                              Full Name
                            </label>

                            <input
                              id="owner-profile-name"
                              type="text"
                              value={profileForm.name}
                              onChange={(e) =>
                                setProfileForm({
                                  ...profileForm,
                                  name: e.target.value,
                                })
                              }
                              placeholder="Enter your full name"
                              required
                              style={{
                                width: "100%",
                                minHeight: "48px",
                                padding: "0 14px",
                                boxSizing: "border-box",
                                border: "1px solid #dbe3f0",
                                borderRadius: "12px",
                                background: "#ffffff",
                                color: "#0f172a",
                                fontSize: "14px",
                                outline: "none",
                              }}
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="owner-profile-email"
                              style={{
                                display: "block",
                                marginBottom: "7px",
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "#475569",
                              }}
                            >
                              Email Address
                            </label>

                            <input
                              id="owner-profile-email"
                              type="email"
                              value={profileForm.email}
                              onChange={(e) =>
                                setProfileForm({
                                  ...profileForm,
                                  email: e.target.value,
                                })
                              }
                              placeholder="Enter your email"
                              required
                              style={{
                                width: "100%",
                                minHeight: "48px",
                                padding: "0 14px",
                                boxSizing: "border-box",
                                border: "1px solid #dbe3f0",
                                borderRadius: "12px",
                                background: "#ffffff",
                                color: "#0f172a",
                                fontSize: "14px",
                                outline: "none",
                              }}
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="primary-btn"
                          disabled={profileLoading}
                          style={{
                            marginTop: "20px",
                            minWidth: "145px",
                          }}
                        >
                          {profileLoading
                            ? "Saving..."
                            : "Save Changes"}
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* CHANGE PASSWORD */}
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "18px",
                      padding: "28px",
                      marginTop: "20px",
                      boxShadow:
                        "0 10px 30px rgba(15, 23, 42, 0.055)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "13px",
                        paddingBottom: "20px",
                        borderBottom: "1px solid #eef2f7",
                        marginBottom: "22px",
                      }}
                    >
                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "12px",
                          background: "#eef2ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "20px",
                          flexShrink: 0,
                        }}
                      >
                        🔐
                      </div>

                      <div>
                        <h2
                          style={{
                            margin: 0,
                            color: "#0f172a",
                            fontSize: "20px",
                          }}
                        >
                          Change Password
                        </h2>

                        <p
                          style={{
                            margin: "7px 0 0",
                            color: "#64748b",
                            fontSize: "13px",
                            lineHeight: 1.5,
                          }}
                        >
                          Update your password to keep your QueueLess
                          account secure.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleChangePassword}>
                      <div
                        style={{
                          display: "grid",
                          gap: "17px",
                        }}
                      >
                        {/* CURRENT PASSWORD */}
                        <div>
                          <label
                            style={{
                              display: "block",
                              marginBottom: "7px",
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "#475569",
                            }}
                          >
                            Current Password
                          </label>

                          <div
                            style={{
                              position: "relative",
                              width: "100%",
                            }}
                          >
                            <input
                              type={
                                showCurrentPassword
                                  ? "text"
                                  : "password"
                              }
                              value={
                                changePasswordForm.currentPassword
                              }
                              onChange={(e) =>
                                setChangePasswordForm({
                                  ...changePasswordForm,
                                  currentPassword:
                                    e.target.value,
                                })
                              }
                              placeholder="Enter your current password"
                              autoComplete="current-password"
                              required
                              style={{
                                width: "100%",
                                minHeight: "48px",
                                padding: "0 48px 0 14px",
                                boxSizing: "border-box",
                                border: "1px solid #dbe3f0",
                                borderRadius: "12px",
                                background: "#ffffff",
                                color: "#0f172a",
                                fontSize: "14px",
                                outline: "none",
                              }}
                            />

                            <button
                              type="button"
                              onClick={() =>
                                setShowCurrentPassword(
                                  (value) => !value
                                )
                              }
                              style={{
                                position: "absolute",
                                right: "10px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                border: "none",
                                background: "transparent",
                                padding: "7px",
                                cursor: "pointer",
                                fontSize: "17px",
                              }}
                            >
                              {showCurrentPassword
                                ? "🙈"
                                : "👁️"}
                            </button>
                          </div>
                        </div>

                        {/* NEW PASSWORD */}
                        <div>
                          <label
                            style={{
                              display: "block",
                              marginBottom: "7px",
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "#475569",
                            }}
                          >
                            New Password
                          </label>

                          <div
                            style={{
                              position: "relative",
                              width: "100%",
                            }}
                          >
                            <input
                              type={
                                showNewPassword
                                  ? "text"
                                  : "password"
                              }
                              value={
                                changePasswordForm.newPassword
                              }
                              onChange={(e) =>
                                setChangePasswordForm({
                                  ...changePasswordForm,
                                  newPassword:
                                    e.target.value,
                                })
                              }
                              placeholder="Enter your new password"
                              autoComplete="new-password"
                              minLength={6}
                              required
                              style={{
                                width: "100%",
                                minHeight: "48px",
                                padding: "0 48px 0 14px",
                                boxSizing: "border-box",
                                border: "1px solid #dbe3f0",
                                borderRadius: "12px",
                                background: "#ffffff",
                                color: "#0f172a",
                                fontSize: "14px",
                                outline: "none",
                              }}
                            />

                            <button
                              type="button"
                              onClick={() =>
                                setShowNewPassword(
                                  (value) => !value
                                )
                              }
                              style={{
                                position: "absolute",
                                right: "10px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                border: "none",
                                background: "transparent",
                                padding: "7px",
                                cursor: "pointer",
                                fontSize: "17px",
                              }}
                            >
                              {showNewPassword
                                ? "🙈"
                                : "👁️"}
                            </button>
                          </div>

                          <p
                            style={{
                              margin: "6px 0 0",
                              fontSize: "12px",
                              color: "#94a3b8",
                            }}
                          >
                            Password must be at least 6 characters.
                          </p>
                        </div>

                        {/* CONFIRM PASSWORD */}
                        <div>
                          <label
                            style={{
                              display: "block",
                              marginBottom: "7px",
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "#475569",
                            }}
                          >
                            Confirm New Password
                          </label>

                          <div
                            style={{
                              position: "relative",
                              width: "100%",
                            }}
                          >
                            <input
                              type={
                                showConfirmPassword
                                  ? "text"
                                  : "password"
                              }
                              value={
                                changePasswordForm.confirmPassword
                              }
                              onChange={(e) =>
                                setChangePasswordForm({
                                  ...changePasswordForm,
                                  confirmPassword:
                                    e.target.value,
                                })
                              }
                              placeholder="Confirm your new password"
                              autoComplete="new-password"
                              minLength={6}
                              required
                              style={{
                                width: "100%",
                                minHeight: "48px",
                                padding: "0 48px 0 14px",
                                boxSizing: "border-box",
                                border: "1px solid #dbe3f0",
                                borderRadius: "12px",
                                background: "#ffffff",
                                color: "#0f172a",
                                fontSize: "14px",
                                outline: "none",
                              }}
                            />

                            <button
                              type="button"
                              onClick={() =>
                                setShowConfirmPassword(
                                  (value) => !value
                                )
                              }
                              style={{
                                position: "absolute",
                                right: "10px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                border: "none",
                                background: "transparent",
                                padding: "7px",
                                cursor: "pointer",
                                fontSize: "17px",
                              }}
                            >
                              {showConfirmPassword
                                ? "🙈"
                                : "👁️"}
                            </button>
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="primary-btn"
                        disabled={changePasswordLoading}
                        style={{
                          marginTop: "22px",
                          minWidth: "175px",
                        }}
                      >
                        {changePasswordLoading
                          ? "Changing Password..."
                          : "Change Password"}
                      </button>
                    </form>
                  </div>
                </>
              )}

              {/* BUSINESS STATUS */}
              {businessSettingsTab === "status" && (
                <div style={settingsPanelStyle}>
                  <h2 style={{ marginTop: 0 }}>Business Status</h2>
                  <p style={{ color: "#64748b", marginBottom: "24px" }}>
                    Control your business availability and queue access.
                  </p>

                  {selectedBusiness ? (
                    <>
                      <div
                        style={{
                          padding: "22px",
                          border: "1px solid #e2e8f0",
                          borderRadius: "16px",
                          marginBottom: "16px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "20px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <h3 style={{ margin: 0 }}>🏪 Business Open / Close</h3>
                          <p style={{ margin: "7px 0 0", color: "#64748b" }}>
                            Allow or stop new customer bookings.
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, color: selectedBusiness.isOpen ? "#16a34a" : "#dc2626" }}>
                            {selectedBusiness.isOpen ? "Currently Open" : "Currently Closed"}
                          </span>
                          <button
                            type="button"
                            className="primary-btn"
                            disabled={businessStatusLoading || selectedBusiness.isOpen}
                            onClick={() => updateBusinessStatus({ isOpen: true })}
                          >
                            Open Business
                          </button>
                          <button
                            type="button"
                            className="secondary-btn"
                            disabled={businessStatusLoading || !selectedBusiness.isOpen}
                            onClick={() => updateBusinessStatus({ isOpen: false })}
                          >
                            Close Business
                          </button>
                        </div>
                      </div>

                      <div
                        style={{
                          padding: "22px",
                          border: "1px solid #e2e8f0",
                          borderRadius: "16px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "20px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <h3 style={{ margin: 0 }}>🎟️ Queue Enabled / Disabled</h3>
                          <p style={{ margin: "7px 0 0", color: "#64748b" }}>
                            Allow or stop customers from joining the queue.
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, color: selectedBusiness.queueEnabled ? "#16a34a" : "#dc2626" }}>
                            {selectedBusiness.queueEnabled ? "Queue Enabled" : "Queue Disabled"}
                          </span>
                          <button
                            type="button"
                            className="primary-btn"
                            disabled={businessStatusLoading || selectedBusiness.queueEnabled}
                            onClick={() => updateBusinessStatus({ queueEnabled: true })}
                          >
                            Enable Queue
                          </button>
                          <button
                            type="button"
                            className="secondary-btn"
                            disabled={businessStatusLoading || !selectedBusiness.queueEnabled}
                            onClick={() => updateBusinessStatus({ queueEnabled: false })}
                          >
                            Disable Queue
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <button className="secondary-btn" onClick={() => openBusinessAccountSettings("status")}>
                      Load Business Status
                    </button>
                  )}
                </div>
              )}

              {/* BUSINESS QR */}
              {businessSettingsTab === "qr" && (
                <div style={settingsPanelStyle}>
                  <h2 style={{ marginTop: 0 }}>Business QR Code</h2>
                  <p style={{ color: "#64748b" }}>
                    Customers can scan this QR code to open your business and join a queue.
                  </p>

                  {qrBusiness ? (
                    <div style={{ textAlign: "center", marginTop: "24px" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          padding: "20px",
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "18px",
                          boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
                        }}
                      >
                        <QRCodeCanvas
                          value={`${window.location.origin}/?businessId=${qrBusiness._id}`}
                          size={250}
                          level="H"
                          includeMargin
                        />
                      </div>

                      <h3 style={{ margin: "18px 0 4px" }}>{qrBusiness.name}</h3>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "5px 12px",
                          borderRadius: "999px",
                          background: "#eef2ff",
                          color: "#4f46e5",
                          fontSize: "12px",
                          fontWeight: 700,
                        }}
                      >
                        {qrBusiness.category}
                      </span>

                      <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap", marginTop: "20px" }}>
                        <button
                          type="button"
                          className="primary-btn"
                          onClick={() => {
                            const canvas = document.querySelector("canvas");
                            if (!canvas) return;
                            const link = document.createElement("a");
                            link.download = `${qrBusiness.name.replace(/\s+/g, "-")}-QR.png`;
                            link.href = canvas.toDataURL("image/png");
                            link.click();
                          }}
                        >
                          ↓ Download QR
                        </button>

                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={async () => {
                            const url = `${window.location.origin}/?businessId=${qrBusiness._id}`;
                            try {
                              await navigator.clipboard.writeText(url);
                              setMessage("QR link copied successfully.");
                            } catch (error) {
                              setMessage(url);
                            }
                          }}
                        >
                          🔗 Copy Link
                        </button>

                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => window.print()}
                        >
                          🖨 Print
                        </button>
                      </div>

                      <div
                        style={{
                          marginTop: "28px",
                          padding: "18px",
                          background: "#f8fafc",
                          borderRadius: "14px",
                          textAlign: "left",
                        }}
                      >
                        <strong>ℹ️ How it works?</strong>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: "14px",
                            marginTop: "14px",
                          }}
                        >
                          <div><strong>1. Scan QR</strong><div style={{ color: "#64748b", fontSize: "12px", marginTop: "4px" }}>Customer scans the code</div></div>
                          <div><strong>2. Select Service</strong><div style={{ color: "#64748b", fontSize: "12px", marginTop: "4px" }}>Choose their service</div></div>
                          <div><strong>3. Join Queue</strong><div style={{ color: "#64748b", fontSize: "12px", marginTop: "4px" }}>Get their queue number</div></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button className="secondary-btn" onClick={() => openBusinessAccountSettings("qr")}>
                      Load QR Code
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // BUSINESS ANALYTICS PAGE
  // ==========================================
  if (page === "business-analytics") {
    const summary = analytics?.summary || {};
    const currentQueue = analytics?.currentQueue || {};
    const performance = analytics?.performance || {};
    const serviceBreakdown = analytics?.serviceBreakdown || [];
    const hourlyActivity = analytics?.hourlyActivity || [];

    const maxHourlyCustomers = Math.max(
      1,
      ...hourlyActivity.map((item) => item.customers || 0)
    );

    const statCards = [
      { icon: "👥", label: "Total Customers", value: summary.totalCustomers ?? 0 },
      { icon: "⏳", label: "Waiting Today", value: summary.waitingToday ?? 0 },
      { icon: "🟢", label: "Currently Serving", value: currentQueue.serving ?? 0 },
      { icon: "✅", label: "Completed Today", value: summary.completedToday ?? 0 },
      { icon: "⏭️", label: "Skipped Today", value: summary.skippedToday ?? 0 },
    ];

    return (
      <div className="dashboard-page">
        <nav className="navbar">
          <div className="brand">
            <div className="logo small">QL</div>
            <span>QueueLess</span>
          </div>

          <div className="navbar-right">
            <span className="user-role">Business Owner</span>
            <button className="logout-btn" onClick={logout}>
              Logout
            </button>
          </div>
        </nav>

        <main className="dashboard">
          <button
            className="back-btn"
            onClick={() => {
              setMessage("");
              setPage("business-dashboard");
            }}
          >
            ← Business Dashboard
          </button>

          <div className="welcome-card">
            <span className="welcome-label">Analytics Dashboard</span>
            <h1>
              {analytics?.business?.name ||
                selectedBusiness?.name ||
                "Business Analytics"}
            </h1>
            <p>
              Monitor today's customer flow, queue performance and service activity.
            </p>
          </div>

          {message && (
            <div className="message">
              {message}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
              marginTop: "24px",
            }}
          >
            {statCards.map((card) => (
              <div
                key={card.label}
                className="dashboard-card"
                style={{ margin: 0 }}
              >
                <div className="card-icon">{card.icon}</div>
                <h2 style={{ marginBottom: "8px" }}>{card.value}</h2>
                <p style={{ margin: 0 }}>{card.label}</p>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "20px",
              marginTop: "20px",
            }}
          >
            <div className="queue-confirm-card">
              <h2>Performance</h2>
              <p>
                <strong>Average Waiting Time:</strong>{" "}
                {performance.averageWaitingTime ?? 0} min
              </p>
              <p>
                <strong>Average Service Time:</strong>{" "}
                {performance.averageServiceTime ?? 0} min
              </p>
              <p>
                <strong>Active Queue:</strong>{" "}
                {currentQueue.active ?? 0} customers
              </p>
            </div>

            <div className="queue-confirm-card">
              <h2>Today's Activity</h2>
              <p>
                <strong>Total Queue Entries:</strong>{" "}
                {summary.totalQueueEntries ?? 0}
              </p>
              <p>
                <strong>Waiting Right Now:</strong>{" "}
                {currentQueue.waiting ?? 0}
              </p>
              <p>
                <strong>Serving Right Now:</strong>{" "}
                {currentQueue.serving ?? 0}
              </p>
            </div>
          </div>

          <div className="queue-confirm-card" style={{ marginTop: "20px" }}>
            <h2>Service Breakdown</h2>

            {serviceBreakdown.length === 0 ? (
              <p>No service activity recorded today.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "10px" }}>Service</th>
                      <th style={{ padding: "10px" }}>Total</th>
                      <th style={{ padding: "10px" }}>Waiting</th>
                      <th style={{ padding: "10px" }}>Serving</th>
                      <th style={{ padding: "10px" }}>Completed</th>
                      <th style={{ padding: "10px" }}>Skipped</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceBreakdown.map((service) => (
                      <tr key={service.serviceName}>
                        <td style={{ padding: "10px", fontWeight: 600 }}>
                          {service.serviceName}
                        </td>
                        <td style={{ textAlign: "center", padding: "10px" }}>{service.total}</td>
                        <td style={{ textAlign: "center", padding: "10px" }}>{service.waiting}</td>
                        <td style={{ textAlign: "center", padding: "10px" }}>{service.serving}</td>
                        <td style={{ textAlign: "center", padding: "10px" }}>{service.completed}</td>
                        <td style={{ textAlign: "center", padding: "10px" }}>{service.skipped}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="queue-confirm-card" style={{ marginTop: "20px" }}>
            <h2>Hourly Customer Activity</h2>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "8px",
                minHeight: "190px",
                overflowX: "auto",
                paddingTop: "20px",
              }}
            >
              {hourlyActivity.map((item) => {
                const height = Math.max(
                  item.customers ? 12 : 4,
                  (item.customers / maxHourlyCustomers) * 130
                );

                return (
                  <div
                    key={item.hour}
                    style={{
                      minWidth: "30px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      height: "160px",
                    }}
                  >
                    <span style={{ fontSize: "11px", marginBottom: "5px" }}>
                      {item.customers}
                    </span>
                    <div
                      style={{
                        width: "18px",
                        height: `${height}px`,
                        borderRadius: "6px 6px 2px 2px",
                        background: "#2563eb",
                      }}
                    />
                    <span style={{ fontSize: "10px", marginTop: "5px" }}>
                      {String(item.hour).padStart(2, "0")}
                    </span>
                  </div>
                );
              })}
            </div>
            <p style={{ marginTop: "12px", opacity: 0.7 }}>
              Hour shown in 24-hour format.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "20px", flexWrap: "wrap" }}>
            <button
              className="secondary-btn"
              onClick={refreshBusinessAnalytics}
              disabled={analyticsLoading}
            >
              {analyticsLoading ? "Refreshing..." : "Refresh Analytics"}
            </button>

            <button
              className="secondary-btn"
              onClick={() => setPage("business-queue")}
            >
              Manage Queue
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // MY BUSINESS PAGE
  // ==========================================
  if (page === "business") {
    return (
      <div className="dashboard-page">

        <nav className="navbar">

          <div className="brand">

            <div className="logo small">
              QL
            </div>

            <span>
              QueueLess
            </span>

          </div>

          <button
            className="logout-btn"
            onClick={logout}
          >
            Logout
          </button>

        </nav>

        <main className="dashboard">

          <button
            className="back-btn"
            onClick={() =>
              setPage(
                "business-dashboard"
              )
            }
          >
            ← Business Dashboard
          </button>

          <div className="welcome-card">

            <span className="welcome-label">
              My Business
            </span>

            <h1>
              {selectedBusiness?.name ||
                "My Business"}
            </h1>

            <p>
              View and manage your business information.
            </p>

          </div>

          {message && (
            <div className="message">
              {message}
            </div>
          )}

          {selectedBusiness ? (
            <div className="queue-confirm-card">

              <div className="card-icon">
                🏢
              </div>

              <h2>
                {selectedBusiness.name}
              </h2>

              <p>
                <strong>
                  Category:
                </strong>{" "}
                {selectedBusiness.category}
              </p>

              <p>
                <strong>
                  Description:
                </strong>{" "}
                {selectedBusiness.description ||
                  "No description available"}
              </p>

              <p>
                <strong>
                  Address:
                </strong>{" "}
                {selectedBusiness.address}
              </p>

              <p>
                <strong>
                  City:
                </strong>{" "}
                {selectedBusiness.city}
              </p>

              <p>
                <strong>
                  Phone:
                </strong>{" "}
                {selectedBusiness.phone ||
                  "Not provided"}
              </p>

              <p>
                <strong>
                  Email:
                </strong>{" "}
                {selectedBusiness.email ||
                  "Not provided"}
              </p>

              <p>
                <strong>
                  Average Service Time:
                </strong>{" "}
                {selectedBusiness.averageServiceTime ||
                  0}{" "}
                minutes
              </p>

              <p>
                <strong>
                  Business Status:
                </strong>{" "}
                {selectedBusiness.isOpen
                  ? "Open"
                  : "Closed"}
              </p>

              <p>
                <strong>
                  Queue:
                </strong>{" "}
                {selectedBusiness.queueEnabled
                  ? "Available"
                  : "Disabled"}
              </p>

            </div>
          ) : (
            <div className="empty-card">

              <div className="card-icon">
                🏢
              </div>

              <h2>
                No Business Found
              </h2>

              <p>
                No active business is associated
                with this account.
              </p>

            </div>
          )}

        </main>
      </div>
    );
  }

  // ==========================================
  // BUSINESS SERVICE MANAGEMENT
  // ==========================================
  if (
    page ===
    "business-services"
  ) {
    return (
      <div className="dashboard-page">

        {/* NAVBAR */}

        <nav className="navbar">

          <div className="brand">

            <div className="logo small">
              QL
            </div>

            <span>
              QueueLess
            </span>

          </div>

          <div className="navbar-right">

            <span className="user-role">
              Business Owner
            </span>

            <button
              className="logout-btn"
              onClick={logout}
            >
              Logout
            </button>

          </div>

        </nav>

        <main className="dashboard">

          {/* BACK BUTTON */}

          <button
            className="back-btn"
            onClick={() => {
              resetServiceForm();

              setPage(
                "business-dashboard"
              );
            }}
          >
            ← Business Dashboard
          </button>

          {/* HEADER */}

          <div className="welcome-card">

            <span className="welcome-label">
              Service Management
            </span>

            <h1>
              Manage Services
            </h1>

            <p>
              Add, update and manage services
              offered by{" "}
              <strong>
                {selectedBusiness?.name ||
                  "your business"}
              </strong>
              .
            </p>

          </div>

          {/* MESSAGE */}

          {message && (
            <div className="message">
              {message}
            </div>
          )}

          {/* =====================================
              ADD / EDIT SERVICE
          ====================================== */}

          <div className="queue-confirm-card">

            <h2>
              {editingService
                ? "Edit Service"
                : "Add New Service"}
            </h2>

            <p>
              {editingService
                ? "Update the service details below."
                : "Create a new service for your business."}
            </p>

            <form
              onSubmit={
                editingService
                  ? handleUpdateService
                  : handleCreateService
              }
            >

              <label>
                Service Name
              </label>

              <input
                type="text"
                placeholder="Example: General Consultation"
                value={
                  serviceForm.name
                }
                onChange={(e) =>
                  setServiceForm({
                    ...serviceForm,
                    name:
                      e.target.value,
                  })
                }
                required
              />

              <label>
                Description
              </label>

              <textarea
                placeholder="Describe this service"
                value={
                  serviceForm.description
                }
                onChange={(e) =>
                  setServiceForm({
                    ...serviceForm,
                    description:
                      e.target.value,
                  })
                }
                rows="4"
              />

              <label>
                Duration (minutes)
              </label>

              <input
                type="number"
                min="1"
                placeholder="15"
                value={
                  serviceForm.duration
                }
                onChange={(e) =>
                  setServiceForm({
                    ...serviceForm,
                    duration:
                      e.target.value,
                  })
                }
                required
              />

              <label>
                Price (₹)
              </label>

              <input
                type="number"
                min="0"
                placeholder="500"
                value={
                  serviceForm.price
                }
                onChange={(e) =>
                  setServiceForm({
                    ...serviceForm,
                    price:
                      e.target.value,
                  })
                }
              />

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  marginTop: "20px",
                }}
              >

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={loading}
                >
                  {loading
                    ? "Saving..."
                    : editingService
                    ? "Update Service"
                    : "Create Service"}
                </button>

                {editingService && (
                  <button
                    type="button"
                    className="back-btn"
                    onClick={
                      resetServiceForm
                    }
                  >
                    Cancel Edit
                  </button>
                )}

              </div>

            </form>

          </div>

          {/* =====================================
              EXISTING SERVICES
          ====================================== */}

          <div className="welcome-card">

            <span className="welcome-label">
              Available Services
            </span>

            <h2>
              Your Services
            </h2>

            <p>
              Manage the services currently
              available to your customers.
            </p>

          </div>

          {services.length ===
          0 ? (
            <div className="empty-card">

              <div className="card-icon">
                🛠️
              </div>

              <h2>
                No Services Yet
              </h2>

              <p>
                You haven't created any services
                for this business yet.
              </p>

              <p>
                Use the form above to create
                your first service.
              </p>

            </div>
          ) : (
            <div className="service-grid">

              {services.map(
                (service) => (
                  <div
                    className="service-card"
                    key={
                      service._id
                    }
                  >

                    <div className="card-icon">
                      🛠️
                    </div>

                    <h2>
                      {service.name}
                    </h2>

                    <p>
                      {service.description ||
                        "No description provided."}
                    </p>

                    <p>
                      <strong>
                        Duration:
                      </strong>{" "}
                      {service.duration}{" "}
                      minutes
                    </p>

                    <p>
                      <strong>
                        Price:
                      </strong>{" "}
                      ₹
                      {service.price ??
                        0}
                    </p>

                    <p>
                      <strong>
                        Status:
                      </strong>{" "}
                      {service.isActive
                        ? "Active"
                        : "Inactive"}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        marginTop: "16px",
                      }}
                    >

                      <button
                        className="secondary-btn"
                        onClick={() =>
                          startEditService(
                            service
                          )
                        }
                        disabled={loading}
                      >
                        Edit
                      </button>

                      <button
                        className="secondary-btn"
                        onClick={() =>
                          handleDeleteService(
                            service._id
                          )
                        }
                        disabled={loading}
                      >
                        Delete
                      </button>

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </main>
      </div>
    );
  }

  // ==========================================
  // BUSINESSES PAGE
  // ==========================================
  if (page === "businesses") {

    return (
      <div className="dashboard-page">

        <nav className="navbar">

          <div className="brand">

            <div className="logo small">
              QL
            </div>

            <span>
              QueueLess
            </span>

          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <NotificationBell />

            <button
              className="logout-btn"
              onClick={logout}
            >
              Logout
            </button>
          </div>

        </nav>

        <main className="dashboard">

          <button
            className="back-btn"
            onClick={() =>
              setPage("dashboard")
            }
          >
            ← Dashboard
          </button>

          <div className="welcome-card">

            <span className="welcome-label">
              Businesses
            </span>

            <h1>
              Find a Business
            </h1>

            <p>
              Explore available businesses and
              choose a service to continue.
            </p>

          </div>

          {message && (
            <div className="message">
              {message}
            </div>
          )}

          {businesses.length ===
          0 ? (
            <div className="empty-card">

              <div className="card-icon">
                🏢
              </div>

              <h2>
                No Businesses Found
              </h2>

              <p>
                There are currently no active
                businesses available.
              </p>

            </div>
          ) : (
            <div className="service-grid">

              {businesses.map(
                (business) => (
                  <div
                    className="service-card"
                    key={
                      business._id
                    }
                  >

                    <div className="card-icon">
                      🏢
                    </div>

                    <h2>
                      {business.name}
                    </h2>

                    <p>
                      <strong>
                        {business.category}
                      </strong>
                    </p>

                    <p>
                      {business.description ||
                        "Business information available"}
                    </p>

                    <p>
                      📍{" "}
                      {business.city}
                    </p>

                    <p>
                      {business.address}
                    </p>

                    <p>
                      Status:{" "}
                      <strong>
                        {business.isOpen
                          ? "Open"
                          : "Closed"}
                      </strong>
                    </p>

                    <p>
                      Queue:{" "}
                      <strong>
                        {business.queueEnabled
                          ? "Available"
                          : "Disabled"}
                      </strong>
                    </p>

                    <button
                      className="secondary-btn"
                      onClick={() =>
                        fetchServices(
                          business
                        )
                      }
                      disabled={
                        loading
                      }
                    >
                      View Services
                    </button>

                  </div>
                )
              )}

            </div>
          )}

        </main>
      </div>
    );
  }

  // ==========================================
  // SERVICES PAGE
  // ==========================================
  if (page === "services") {

    return (
      <div className="dashboard-page">

        <nav className="navbar">

          <div className="brand">

            <div className="logo small">
              QL
            </div>

            <span>
              QueueLess
            </span>

          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <NotificationBell />

            <button
              className="logout-btn"
              onClick={logout}
            >
              Logout
            </button>
          </div>

        </nav>

        <main className="dashboard">

          <button
            className="back-btn"
            onClick={() =>
              setPage(
                "businesses"
              )
            }
          >
            ← Businesses
          </button>

          <div className="welcome-card">

            <span className="welcome-label">
              Services
            </span>

            <h1>
              {selectedBusiness?.name}
            </h1>

            <p>
              Select a service to continue.
            </p>

          </div>

          {message && (
            <div className="message">
              {message}
            </div>
          )}

          <div className="service-grid">

            {services.length ===
            0 ? (
              <div className="empty-card">

                <h2>
                  No services available
                </h2>

                <p>
                  This business currently
                  has no active services.
                </p>

              </div>
            ) : (
              services.map(
                (service) => (
                  <div
                    className="service-card"
                    key={
                      service._id
                    }
                  >

                    <div className="card-icon">
                      🎟️
                    </div>

                    <h2>
                      {service.name}
                    </h2>

                    <p>
                      {service.description ||
                        "Service available"}
                    </p>

                    <p>
                      Duration:{" "}
                      {service.duration}{" "}
                      min
                    </p>

                    <p>
                      Price: ₹
                      {service.price}
                    </p>

                    <button
                      className="secondary-btn"
                      onClick={() =>
                        selectServiceForQueue(
                          service
                        )
                      }
                    >
                      Select Service
                    </button>

                  </div>
                )
              )
            )}

          </div>

        </main>
      </div>
    );
  }

  // ==========================================
  // JOIN QUEUE CONFIRMATION
  // ==========================================
  if (
    page ===
    "join-confirm"
  ) {

    return (
      <div className="dashboard-page">

        <nav className="navbar">

          <div className="brand">

            <div className="logo small">
              QL
            </div>

            <span>
              QueueLess
            </span>

          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <NotificationBell />

            <button
              className="logout-btn"
              onClick={logout}
            >
              Logout
            </button>
          </div>

        </nav>

        <main className="dashboard">

          <button
            className="back-btn"
            onClick={() =>
              setPage("services")
            }
          >
            ← Services
          </button>

          <div className="welcome-card">

            <span className="welcome-label">
              Join Queue
            </span>

            <h1>
              Confirm Your Queue
            </h1>

            <p>
              Review your selected service
              before joining.
            </p>

          </div>

          <div className="queue-confirm-card">

            <h2>
              {selectedBusiness?.name}
            </h2>

            <hr />

            <h3>
              {selectedService?.name}
            </h3>

            <p>
              {selectedService?.description}
            </p>

            <p>
              Duration:{" "}
              {selectedService?.duration}{" "}
              minutes
            </p>

            <p>
              Price: ₹
              {selectedService?.price}
            </p>

            {message && (
              <div className="message">
                {message}
              </div>
            )}

            <button
              className="primary-btn"
              onClick={
                handleJoinQueue
              }
              disabled={loading}
            >
              {loading
                ? "Joining Queue..."
                : "Join Queue"}
            </button>

          </div>

        </main>
      </div>
    );
  }

  // ==========================================
  // MY QUEUE PAGE
  // ==========================================
  if (
    page === "my-queue"
  ) {

    return (
      <div className="dashboard-page">

        <nav className="navbar">

          <div className="brand">

            <div className="logo small">
              QL
            </div>

            <span>
              QueueLess
            </span>

          </div>

          <button
            className="logout-btn"
            onClick={logout}
          >
            Logout
          </button>

        </nav>

        <main className="dashboard">

          <button
            className="back-btn"
            onClick={() =>
              setPage("dashboard")
            }
          >
            ← Dashboard
          </button>

          <div className="welcome-card">

            <span className="welcome-label">
              My Queue
            </span>

            <h1>
              Your Queue
            </h1>

            <p>
              Track your current queue
              position.
            </p>

          </div>

          {message && (
            <div className="message">
              {message}
            </div>
          )}

          {!myQueue ? (

            <div className="empty-card">

              <div className="card-icon">
                🎟️
              </div>

              <h2>
                No Active Queue
              </h2>

              <p>
                You haven't joined any
                queue yet.
              </p>

              <button
                className="primary-btn"
                onClick={
                  openJoinQueue
                }
              >
                Join a Queue
              </button>

            </div>

          ) : (

            <div className="my-queue-card">

              <div className="queue-status-header">

                <span>
                  Queue Status
                </span>

                <span className="live">
                  ● LIVE
                </span>

              </div>

              <h2>
                {myQueue.business?.name ||
                  selectedBusiness?.name ||
                  "QueueLess Care Clinic"}
              </h2>

              <p>
                {myQueue.service?.name ||
                  selectedService?.name ||
                  "Selected Service"}
              </p>

              <div className="token-number">
                #
                {myQueue.tokenNumber ??
                  "--"}
              </div>

              <p>
                Your current token
              </p>

              <div className="queue-info">

                <div>

                  <strong>
                    {myQueue.peopleAhead ??
                      0}
                  </strong>

                  <span>
                    People Ahead
                  </span>

                </div>

                <div>

                  <strong>
                    {myQueue.estimatedWaitTime ??
                      0}{" "}
                    min
                  </strong>

                  <span>
                    Estimated Wait
                  </span>

                </div>

              </div>

              <div className="queue-status">

                Status:{" "}

                <strong>
                  {myQueue.status
                    ? myQueue.status
                        .charAt(0)
                        .toUpperCase() +
                      myQueue.status.slice(1)
                    : "Waiting"}
                </strong>

              </div>

            </div>
          )}

        </main>
      </div>
    );
  }

  // ==========================================
  // BUSINESS QUEUE MANAGEMENT PAGE
  // ==========================================
  if (page === "business-queue") {
    const servingCustomer =
      businessQueue.find((queue) => queue.status === "serving") || null;

    const waitingCustomers = businessQueue.filter(
      (queue) => queue.status === "waiting"
    );

    const getCustomerName = (queue) =>
      queue.customer?.name || "Customer";

    const getServiceName = (queue) =>
      queue.service?.name || "Service";

    const getStatusLabel = (status) => {
      if (!status) return "Unknown";
      return status.charAt(0).toUpperCase() + status.slice(1);
    };

    return (
      <div className="dashboard-page">
        <nav className="navbar">
          <div className="brand">
            <div className="logo small">QL</div>
            <span>QueueLess</span>
          </div>

          <div className="navbar-right">
            <span className="user-role">Business Owner</span>
            <button className="logout-btn" onClick={logout}>
              Logout
            </button>
          </div>
        </nav>

        <main className="dashboard">
          <button
            className="back-btn"
            onClick={() => {
              setMessage("");
              setPage("business-dashboard");
            }}
          >
            ← Business Dashboard
          </button>

          <div className="welcome-card">
            <span className="welcome-label">Queue Management</span>
            <h1>Manage Customer Queue</h1>
            <p>
              {businessQueueBusiness?.name || "Your Business"} — manage waiting
              customers and control the current service.
            </p>
          </div>

          {message && (
            <div
              style={{
                marginTop: "18px",
                padding: "12px 16px",
                borderRadius: "10px",
                background: "#fff7ed",
                color: "#c2410c",
                border: "1px solid #fed7aa",
                fontWeight: 600,
              }}
            >
              {message}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
              marginTop: "24px",
            }}
          >
            <div className="dashboard-card">
              <div className="card-icon">⏳</div>
              <h2>{waitingCustomers.length}</h2>
              <p>Waiting Customers</p>
            </div>

            <div className="dashboard-card">
              <div className="card-icon">🎯</div>
              <h2>
                {servingCustomer
                  ? `#${servingCustomer.tokenNumber}`
                  : "—"}
              </h2>
              <p>Currently Serving</p>
            </div>

            <div className="dashboard-card">
              <div className="card-icon">🎟️</div>
              <h2>{businessQueue.length}</h2>
              <p>Active Queue</p>
            </div>
          </div>

          <div
            style={{
              marginTop: "24px",
              padding: "24px",
              background: "#ffffff",
              borderRadius: "16px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                flexWrap: "wrap",
                marginBottom: "20px",
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>Current Queue</h2>
                <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                  {waitingCustomers.length > 0
                    ? `${waitingCustomers.length} customer${waitingCustomers.length === 1 ? "" : "s"} waiting`
                    : "No customers are waiting"}
                </p>
              </div>

              <button
                className="secondary-btn"
                onClick={handleCallNext}
                disabled={
                  queueActionLoading ||
                  loading ||
                  Boolean(servingCustomer) ||
                  waitingCustomers.length === 0
                }
              >
                {queueActionLoading
                  ? "Processing..."
                  : servingCustomer
                  ? `Serving #${servingCustomer.tokenNumber}`
                  : waitingCustomers.length === 0
                  ? "No Waiting Customers"
                  : "Call Next"}
              </button>
            </div>

            {servingCustomer && (
              <div
                style={{
                  padding: "20px",
                  borderRadius: "14px",
                  border: "1px solid #c7d2fe",
                  background: "#eef2ff",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "20px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <span
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#4f46e5",
                        marginBottom: "6px",
                      }}
                    >
                      Currently Serving
                    </span>
                    <h2 style={{ margin: "0 0 6px" }}>
                      Token #{servingCustomer.tokenNumber}
                    </h2>
                    <p style={{ margin: "4px 0", fontWeight: 700 }}>
                      {getCustomerName(servingCustomer)}
                    </p>
                    <p style={{ margin: "4px 0", color: "#64748b" }}>
                      {getServiceName(servingCustomer)}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      className="secondary-btn"
                      disabled={queueActionLoading}
                      onClick={() =>
                        runQueueAction(servingCustomer._id, "complete")
                      }
                    >
                      Complete
                    </button>
                    <button
                      className="secondary-btn"
                      disabled={queueActionLoading}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Skip token #${servingCustomer.tokenNumber}?`
                          )
                        ) {
                          runQueueAction(servingCustomer._id, "skip");
                        }
                      }}
                    >
                      Skip
                    </button>
                  </div>
                </div>
              </div>
            )}

            {businessQueue.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "50px 20px",
                  color: "#64748b",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "14px",
                }}
              >
                <div style={{ fontSize: "42px", marginBottom: "10px" }}>🎟️</div>
                <h3 style={{ margin: "0 0 8px", color: "#334155" }}>
                  No Active Customers
                </h3>
                <p style={{ margin: 0 }}>
                  Customers who join your queue will appear here.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "720px",
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ textAlign: "left", padding: "13px 10px" }}>Token</th>
                      <th style={{ textAlign: "left", padding: "13px 10px" }}>Customer</th>
                      <th style={{ textAlign: "left", padding: "13px 10px" }}>Service</th>
                      <th style={{ textAlign: "left", padding: "13px 10px" }}>Status</th>
                      <th style={{ textAlign: "left", padding: "13px 10px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {businessQueue.map((queue) => (
                      <tr
                        key={queue._id}
                        style={{ borderBottom: "1px solid #f1f5f9" }}
                      >
                        <td style={{ padding: "15px 10px", fontWeight: 800 }}>
                          #{queue.tokenNumber}
                        </td>
                        <td style={{ padding: "15px 10px" }}>
                          <div style={{ fontWeight: 700 }}>
                            {getCustomerName(queue)}
                          </div>
                          {queue.customer?.email && (
                            <div style={{ color: "#64748b", fontSize: "13px" }}>
                              {queue.customer.email}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "15px 10px" }}>
                          {getServiceName(queue)}
                        </td>
                        <td style={{ padding: "15px 10px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "6px 10px",
                              borderRadius: "999px",
                              background:
                                queue.status === "serving"
                                  ? "#dcfce7"
                                  : "#fef3c7",
                              color:
                                queue.status === "serving"
                                  ? "#166534"
                                  : "#92400e",
                              fontSize: "13px",
                              fontWeight: 700,
                            }}
                          >
                            {getStatusLabel(queue.status)}
                          </span>
                        </td>
                        <td style={{ padding: "15px 10px" }}>
                          {queue.status === "waiting" && (
                            <button
                              className="secondary-btn"
                              disabled={queueActionLoading || Boolean(servingCustomer)}
                              onClick={handleCallNext}
                              style={{ padding: "8px 13px" }}
                            >
                              Call Next
                            </button>
                          )}

                          {queue.status === "serving" && (
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                              <button
                                className="secondary-btn"
                                disabled={queueActionLoading}
                                onClick={() =>
                                  runQueueAction(queue._id, "complete")
                                }
                                style={{ padding: "8px 13px" }}
                              >
                                Complete
                              </button>
                              <button
                                className="secondary-btn"
                                disabled={queueActionLoading}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Skip token #${queue.tokenNumber}?`
                                    )
                                  ) {
                                    runQueueAction(queue._id, "skip");
                                  }
                                }}
                                style={{ padding: "8px 13px" }}
                              >
                                Skip
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // HOME PAGE
  // ==========================================
  return (
    <div className="app home-app">

      <nav className="landing-navbar">
        <div className="brand">
          <div className="logo small">QL</div>
          <span>QueueLess</span>
        </div>

        <div className="landing-nav-links">
          <button type="button" onClick={() => document.getElementById("home-features")?.scrollIntoView({ behavior: "smooth" })}>
            Features
          </button>
          <button type="button" onClick={() => document.getElementById("home-about")?.scrollIntoView({ behavior: "smooth" })}>
            About
          </button>
        </div>

        <div className="nav-actions">
          <button
            className="nav-login"
            onClick={() => {
              resetLoginForm();
              setPage("home");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Login
          </button>

          <button
            className="nav-register"
            onClick={() => {
              resetRegisterForm();
              setPage("register");
            }}
          >
            Get Started
          </button>
        </div>
      </nav>

      <section className="home-hero">

        <div className="home-hero-content">

          <div className="home-kicker">
            <span className="kicker-dot" />
            SMART QUEUE MANAGEMENT
          </div>

          <h1>
            Skip the Wait.
            <br />
            <span>Queue Smarter.</span>
          </h1>

          <p>
            QueueLess helps customers join queues digitally,
            track their position in real time, and helps
            businesses manage service flow efficiently.
          </p>

          <div className="home-benefits">
            <div>
              <span>◉</span>
              <strong>Save Time</strong>
              <small>For Customers</small>
            </div>
            <div>
              <span>◈</span>
              <strong>Higher Efficiency</strong>
              <small>For Businesses</small>
            </div>
            <div>
              <span>✦</span>
              <strong>Better Experience</strong>
              <small>For Everyone</small>
            </div>
          </div>

          <div className="home-hero-buttons">
            <button
              className="primary-btn hero-btn"
              onClick={() => {
                resetRegisterForm();
                setPage("register");
              }}
            >
              Get Started <span>→</span>
            </button>

            <button
              className="outline-btn"
              onClick={() => {
                document
                  .getElementById("home-features")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Explore QueueLess
            </button>
          </div>

        </div>

        <div className="home-hero-visual" aria-hidden="true">
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />

          <div className="hero-phone">
            <div className="hero-phone-top">
              <span className="hero-phone-brand">QL</span>
              <span>QueueLess</span>
            </div>

            <div className="hero-phone-screen">
              <span className="hero-phone-kicker">SMART QUEUE</span>
              <h3>Skip the Wait.</h3>

              <div className="hero-qr-frame">
                <QRCodeCanvas
                  value={window.location.origin}
                  size={132}
                  level="H"
                  includeMargin
                />
              </div>

              <strong>Scan to Join</strong>
              <small>Join your queue digitally</small>
            </div>
          </div>

          <div className="hero-floating-card hero-floating-card-top">
            <span className="floating-icon">⚡</span>
            <div>
              <strong>Real-Time Updates</strong>
              <small>Track your token live</small>
            </div>
          </div>

          <div className="hero-floating-card hero-floating-card-bottom">
            <span className="floating-icon">🎟️</span>
            <div>
              <strong>Digital Queue</strong>
              <small>No physical waiting</small>
            </div>
          </div>

          <div className="hero-spark spark-one">✦</div>
          <div className="hero-spark spark-two">✦</div>
          <div className="hero-spark spark-three">•</div>
        </div>

        <div className="home-login-shell">
          <div className="home-auth-tabs">
            <button className="active" type="button">Login</button>
            <button
              type="button"
              onClick={() => {
                resetRegisterForm();
                setPage("register");
              }}
            >
              Register
            </button>
          </div>

          <div className="home-auth-card">

            <div className="home-auth-heading">
              <div className="home-auth-icon">QL</div>
              <h2>Welcome Back!</h2>
              <p>Sign in to your QueueLess account</p>
            </div>

            {message && (
              <div
                className={`message home-message ${
                  /invalid|failed|error|required|incorrect|not found|expired/i.test(
                    message
                  )
                    ? "home-message-error"
                    : ""
                }`}
              >
                {message}
              </div>
            )}

            <form onSubmit={handleLogin} className="home-login-form">

              <label>Email address</label>
              <div className="home-input-wrap">
                <span>✉</span>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={loginData.email}
                  onChange={(e) =>
                    setLoginData({
                      ...loginData,
                      email: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <label>Password</label>
              <div className="home-input-wrap">
                <span>🔒</span>
                <input
                  type={showLoginPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({
                      ...loginData,
                      password: e.target.value,
                    })
                  }
                  required
                />
                <button
                  type="button"
                  className="home-password-toggle"
                  aria-label={
                    showLoginPassword ? "Hide password" : "Show password"
                  }
                  onClick={() =>
                    setShowLoginPassword((current) => !current)
                  }
                >
                  {showLoginPassword ? "🙈" : "👁️"}
                </button>
              </div>

              <div className="home-form-row">
                <label className="remember-row">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  className="forgot-btn"
                  onClick={() => {
                    setForgotData({
                      email: loginData.email || "",
                      newPassword: "",
                      confirmPassword: "",
                    });
                    setMessage("");
                    setResetPasswordMessageType("");
                    setShowResetPassword(false);
                    setShowResetConfirmPassword(false);
                    setPage("forgot-password");
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className="primary-btn home-login-btn"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Login →"}
              </button>

            </form>

            <div className="home-auth-divider">
              <span>or continue with</span>
            </div>

            <div className="home-socials">
              <button type="button" onClick={() => setMessage("Social login is not configured yet.")}>G</button>
              <button type="button" onClick={() => setMessage("Social login is not configured yet.")}></button>
              <button type="button" onClick={() => setMessage("Social login is not configured yet.")}>▦</button>
            </div>

            <p className="home-register-prompt">
              Don't have an account?
              <button
                type="button"
                onClick={() => {
                  resetRegisterForm();
                  setPage("register");
                }}
              >
                Register
              </button>
            </p>

          </div>
        </div>

      </section>

      <section className="home-feature-strip" id="home-features">
        <div>
          <span>01</span>
          <strong>Digital Queues</strong>
          <p>Join remotely without standing in physical lines.</p>
        </div>
        <div>
          <span>02</span>
          <strong>Real-Time Updates</strong>
          <p>Track token movement and queue changes instantly.</p>
        </div>
        <div>
          <span>03</span>
          <strong>Smart Analytics</strong>
          <p>Help businesses understand customer flow.</p>
        </div>
        <div>
          <span>04</span>
          <strong>Secure Access</strong>
          <p>Role-based access protects your queue data.</p>
        </div>
      </section>

      <section className="features home-features-section" id="home-about">
        <div className="section-heading">
          <span>POWERFUL FEATURES</span>
          <h2>Everything you need to<br />manage queues</h2>
        </div>

        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">🎟️</div>
            <h3>Digital Queues</h3>
            <p>Join queues remotely without standing in physical lines.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Real-Time Updates</h3>
            <p>Track queue movement and token updates instantly.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📈</div>
            <h3>Smart Analytics</h3>
            <p>Businesses can monitor queue performance and customer flow.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔐</div>
            <h3>Secure Access</h3>
            <p>Role-based authentication keeps business and customer data secure.</p>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <div className="brand">
          <div className="logo small">QL</div>
          <span>QueueLess</span>
        </div>
        <p>Smart queue management for modern businesses.</p>
        <span className="footer-copy">© QueueLess</span>
      </footer>

    </div>
  );

}

export default App;