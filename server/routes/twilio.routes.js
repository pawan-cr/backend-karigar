const express = require("express");
const router = express.Router();
const { getToken, handleVoice, sendOtp, verifyOtp } = require("../api/twilio/twilio.controller");

// POST /api/twilio/token
// Generates a Twilio Access Token with VoiceGrant for the requesting client.
router.post("/token", getToken);

// POST /api/twilio/voice
// TwiML webhook — set this URL as the Voice URL in your Twilio TwiML App.
// Twilio calls this endpoint when a client initiates an outgoing call.
router.post("/voice", handleVoice);
router.get("/voice", handleVoice);

// POST /api/twilio/send-otp
// Sends a verification code via SMS using Twilio Verify Service.
router.post("/send-otp", sendOtp);

// POST /api/twilio/verify-otp
// Verifies the code and logs in or registers the user.
router.post("/verify-otp", verifyOtp);

module.exports = router;
