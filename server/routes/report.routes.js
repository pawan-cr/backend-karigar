const express = require("express");
const { checkUser, verifyToken, isAdmin } = require("../middleware/auth.middleware");
const {
  createReport,
  getAllReports,
  getReportById,
  approveReport,
  rejectReport,
  updateReportStatus,
  getBusinessReports,
} = require("../api/reports/reportController");
const router = express.Router();

router.post("/business/create", verifyToken, checkUser, createReport);
router.post(
  "/business/list",
  verifyToken,
  checkUser,
  isAdmin,
  getBusinessReports,
);
router.post("/createreport", verifyToken, checkUser, createReport);
router.post("/", verifyToken, checkUser, isAdmin, getAllReports);
router.post("/status", verifyToken, checkUser, isAdmin, updateReportStatus);
router.post("/approvereport", verifyToken, checkUser, isAdmin, approveReport);
router.post("/rejectreport", verifyToken, checkUser, isAdmin, rejectReport);
router.post("/getreportbyid", verifyToken, checkUser, isAdmin, getReportById);
router.post("/getbusinessreports", verifyToken, checkUser, isAdmin, getBusinessReports);

module.exports = router;
