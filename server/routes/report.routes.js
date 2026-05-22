const express = require("express");
const { checkUser, verifyToken, isAdmin } = require("../middleware/auth.middleware");
const { createReport, getAllReports, getReportById, approveReport, rejectReport, getBusinessReports } = require("../api/reports/reportController");
const router = express.Router();

router.post("/createreport", verifyToken, checkUser, createReport);
router.post("/getallreports", verifyToken, checkUser, isAdmin, getAllReports);
router.post("/getreportbyid", verifyToken, checkUser, isAdmin , getReportById)
router.post("/approvereport", verifyToken, checkUser, isAdmin , approveReport)
router.post("/rejectreport", verifyToken, checkUser, isAdmin , rejectReport)
router.post("/getbusinessreports", verifyToken, checkUser, isAdmin , getBusinessReports)

module.exports = router;
