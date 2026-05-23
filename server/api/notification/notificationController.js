const Notification = require("./notificationModel");

const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user_id: req.dbUser._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({ notifications });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const createNotification = async (req, res) => {
  try {
    const { user_id, title, message, type } = req.body;
    if (!user_id || !title || !message) {
      return res.status(400).json({ message: "User, title and message are required" });
    }

    const notification = await Notification.create({
      user_id,
      title,
      message,
      type,
    });

    return res.status(201).json({ message: "Notification created", notification });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.body;
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user_id: req.dbUser._id },
      { is_read: true },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.status(200).json({ message: "Notification marked as read", notification });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getMyNotifications,
  createNotification,
  markNotificationRead,
};
