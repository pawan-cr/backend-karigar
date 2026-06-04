const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

const sendPhoneOTP = async (req, res) => {
  try {
    console.log(process.env.TWILIO_ACCOUNT_SID);
    console.log(process.env.TWILIO_AUTH_TOKEN);
    console.log(process.env.TWILIO_VERIFY_SERVICE_SID);
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({
        to: phone,
        channel: "sms",
      });

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const verifyPhoneOTP = async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: "Phone and code are required",
      });
    }

    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: phone,
        code,
      });

    if (verificationCheck.status === "approved") {
      return res.status(200).json({
        success: true,
        verified: true,
        message: "Phone number verified",
      });
    }

    return res.status(400).json({
      success: false,
      verified: false,
      message: "Invalid OTP",
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  sendPhoneOTP,
  verifyPhoneOTP,
};
