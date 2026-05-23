const mongoose = require("mongoose");
const Report = require("./reportModel");
const Business = require("../business/businessModel");
const { createUserNotification } = require("../../utils/notify");

const createReport = async (req, res) => {
  try {
    const businessId = req.body.businessId || req.body.business_id;

    if (!businessId) {
      return res.status(400).json({ message: "Business ID is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({ message: "Invalid Business ID" });
    }

    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ message: "Reason is required" });
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ message: "Business Not Found" });
    }

    const report = await Report.create({
      user_id: req.dbUser._id,
      business_id: businessId,
      reason,
    });

    return res.status(201).json({
      message: "Report Created",
      data: report,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAllReports = async (req, res) => {
  try {
    const { status } = req.body;
    const filter = {};
    if (status) filter.status = status;

    const reports = await Report.find(filter)
      .populate("business_id", "name city")
      .populate("user_id", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Fetched all reports",
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getReportById = async (req, res) => {
  try {
    const reportId = req.body.reportId || req.body.id;
    if (!reportId) {
      return res.status(400).json({ message: "Report ID is required" });
    }

    const report = await Report.findById(reportId)
      .populate("business_id", "name city")
      .populate("user_id", "name email");
    if (!report) {
      return res.status(404).json({ message: "Report Not Found" });
    }
    return res.status(200).json({
      message: "Fetched Report by ID",
      data: report,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateReportStatus = async (req, res) => {
  try {
    const reportId = req.body.reportId;
    const { status } = req.body;

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const report = await Report.findById(reportId)
      .populate("business_id", "name city owner_id")
      .populate("user_id", "name email");
    if (!report) {
      return res.status(404).json({ message: "Report Not Found" });
    }

    report.status = status;
    await report.save();

    if (status === "approved" && report.business_id) {
      await Business.findByIdAndUpdate(report.business_id._id, {
        is_active: false,
      });
    }

    await createUserNotification(
      report.user_id._id,
      "Report update",
      `Your report for ${report.business_id?.name || "a business"} was ${status}.`,
      "report_status",
    );

    return res.status(200).json({
      message: `Report ${status}`,
      data: report,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const approveReport = async (req, res) => {
  req.body.status = "approved";
  req.body.reportId = req.body.id;
  return updateReportStatus(req, res);
};

const rejectReport = async (req, res) => {
  req.body.status = "rejected";
  req.body.reportId = req.body.id;
  return updateReportStatus(req, res);
};

const getBusinessReports = async (req, res) => {
  try {
    const businessId = req.body.businessId || req.body.b_id;
    if (!businessId) {
      return res.status(400).json({ message: "Business ID is required" });
    }

    const reports = await Report.find({ business_id: businessId })
      .populate("business_id", "name city")
      .populate("user_id", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Fetched Business's Reports",
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createReport,
  getAllReports,
  getReportById,
  approveReport,
  rejectReport,
  updateReportStatus,
  getBusinessReports,
};
