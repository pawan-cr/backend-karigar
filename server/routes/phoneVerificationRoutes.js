const express = require("express")
const { sendPhoneOTP, verifyPhoneOTP } = require("../api/numberVerification/businessNumVerificationController")
const router = express.Router()

router.post("/send-phone-otp", sendPhoneOTP)
router.post("/verify-phone-otp", verifyPhoneOTP)

module.exports = router