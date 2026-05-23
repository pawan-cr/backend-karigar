const AdminActivity = require("./adminActivityModel");

const logAdminActivity = async (
  req,
  { action, resource, resource_id = null, resource_model = "User", details = {} },
) => {
  if (!req?.dbUser || req.dbUser.role !== "admin") {
    return;
  }

  try {
    await AdminActivity.create({
      admin_id: req.dbUser._id,
      action,
      resource,
      resource_id,
      resource_model,
      details,
      route: req.originalUrl || "",
      method: req.method || "",
    });
  } catch (error) {
    console.error("Failed to record admin activity:", error);
  }
};

module.exports = { logAdminActivity };
