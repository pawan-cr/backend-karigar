const Notification = require("../api/notification/notificationModel");
const User = require("../api/user/userModel");
const { admin } = require("../config/firebase");

const createUserNotification = async (
  userId,
  title,
  message,
  type = "system",
) => {
  if (!userId) return null;
  try {
    // save to db
    const notification = await Notification.create({
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
    });

    // send fcm push notification
    const user = await User.findById(userId).select("fcm_token");
    if (user?.fcm_token) {
      try {
        await admin.messaging().send({
          token: user.fcm_token,
          notification: { title, body: message },
          data: { type, notificationId: notification._id.toString() },
        });
      } catch (fcmError) {
        console.error("FCM push notification send error:", fcmError.message);
      }
    }

    return notification;
  } catch (error) {
    console.error("Notification create error:", error.message);
    return null;
  }
};

const notifyAdmins = async (title, message, type = "admin_alert") => {
  try {
    const admins = await User.find({ role: "admin", is_blocked: false });
    const promises = admins.map((adminUser) =>
      createUserNotification(adminUser._id, title, message, type)
    );
    await Promise.all(promises);
  } catch (error) {
    console.error("notifyAdmins error:", error.message);
  }
};

module.exports = { createUserNotification, notifyAdmins };

