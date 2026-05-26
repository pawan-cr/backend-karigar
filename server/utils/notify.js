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
    return await Notification.create({
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
    });

    // send fcm push notification
    const user = await User.findById(userId).select("fcm_token");
    if (user?.fcm_token) {
      await admin.messaging().send({
        token: user.fcm_token,
        notification: { title, body: message },
        data: { type, notificationId: notification._id.toString() },
      });
    }

    return notification;
  } catch (error) {
    console.error("Notification create error:", error.message);
    return null;
  }
};

module.exports = { createUserNotification };
