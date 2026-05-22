const mongoose = require("mongoose");
const Report = require("./reportModel");
const Business = require("../business/businessModel");

// API to create report
const createReport = async (req, res) => {
  try {
    const { business_id, reason } = req.body;

    if (!req.dbUser) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }
    if (!business_id) {
      return res.status(400).json({
        message: "Business ID is required",
      });
    }
    if (!mongoose.Types.ObjectId.isValid(business_id)) {
      return res.status(400).json({
        message: "Invalid Business ID",
      });
    }
    if (!reason) {
      return res.status(400).json({
        message: "Reason is required",
      });
    }

    const business = await Business.findById(business_id);
    if (!business) {
      return res.status(404).json({
        message: "Business Not Found",
      });
    }
    const report = await Report.create({
      user_id: req.dbUser._id,
      business_id: business_id,
      reason,
    });
    return res.status(201).json({
      message: "Report Created",
      data: report,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: error.message,
    });
  }
};

// API to get all reports
const getAllReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("business_id", "name city")
      .populate("user_id", "name email");

    return res.status(200).json({
      message: "Fetched all reports",
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// API to get report by ID
const getReportById = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({
        message: "Report ID is required",
      });
    }
    const report = await Report.findById(id)
      .populate("business_id", "name city")
      .populate("user_id", "name email");
    if (!report) {
      return res.status(404).json({
        message: "Report Not Found",
      });
    }
    return res.status(200).json({
      message: "Fetched Report by ID",
      data: report,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// API to approve Report
const approveReport = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({
        message: "Report ID is required",
      });
    }
    const report = await Report.findById(id)
      .populate("business_id", "name city")
      .populate("user_id", "name email");
    if (!report) {
      return res.status(404).json({
        message: "Report Not Found",
      });
    }
    report.status = "approved";
    await report.save();

    return res.status(200).json({
      message: "Report Approved",
      data: report,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// API to reject the report
const rejectReport = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({
        message: "Report ID is required",
      });
    }
    const report = await Report.findById(id)
      .populate("business_id", "name city")
      .populate("user_id", "name email");
    if (!report) {
      return res.status(404).json({
        message: "Report Not Found",
      });
    }
    report.status = "rejected";
    await report.save();

    return res.status(200).json({
      message: "Report Approved",
      data: report,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// API to get Business's reports
const getBusinessReports = async (req, res) => {
  try {
    const { b_id } = req.body;
    if (!b_id) {
      return res.status(400).json({
        message: "Business ID is required",
      });
    }
    const reports = await Report.find({ business_id: b_id })
      .populate("business_id", "name city")
      .populate("user_id", "name email");
    if (!reports) {
      return res.status(404).json({
        message: "Reports Not Found",
      });
    }

    return res.status(200).json({
      message: "Fetched Business's Reports",
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  createReport,
  getAllReports,
  getReportById,
  approveReport,
  rejectReport,
  getBusinessReports,
};
