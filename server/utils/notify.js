const Notification = require("../api/notification/notificationModel");

const createUserNotification = async (userId, title, message, type = "system") => {
  if (!userId) return null;
  try {
    return await Notification.create({
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
    });
  } catch (error) {
    console.error("Notification create error:", error.message);
    return null;
  }
};

module.exports = { createUserNotification };
