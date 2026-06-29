const twilio = require("twilio");
const User = require("../user/userModel");
const jwt = require("jsonwebtoken");

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;
const VoiceResponse = twilio.twiml.VoiceResponse;

function generateIdentity() {
  const suffix = Math.random().toString(36).substring(2, 7);
  return `client_${Date.now()}_${suffix}`;
}

function isValidPhoneNumber(number) {
  return /^\+[1-9]\d{1,14}$/.test(number);
}

function isValidClientIdentity(identity) {
  return /^[a-zA-Z0-9_\-]{1,128}$/.test(identity);
}

function normalizePhoneNumber(value) {
  if (typeof value !== "string") {
    return null;
  }

  let phone = value.trim();
  if (!phone) {
    return null;
  }

  if (!phone.startsWith("+")) {
    if (phone.length === 10 && /^\d+$/.test(phone)) {
      phone = "+91" + phone;
    } else {
      phone = "+" + phone;
    }
  }

  return isValidPhoneNumber(phone) ? phone : null;
}

function sendTwimlError(res, statusCode, message) {
  const twiml = new VoiceResponse();
  twiml.say(message);
  res.set("Content-Type", "text/xml");
  // Twilio requires HTTP 200 to read TwiML messages; non-200 causes a generic application error
  return res.status(200).send(twiml.toString());
}

function getTwilioVerifyCredentials() {
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_PHONE_VERIFY_SID,
    TWILIO_PHONE_VERIFY,
    TWILIO_TEJAAS,
    TWILIO_TEJAS,
    TWILIO_AUTH_TOKEN,
    TWILIO_VERIFY_SERVICE_SID,
  } = process.env;

  const accountSid = TWILIO_PHONE_VERIFY_SID || TWILIO_ACCOUNT_SID;
  const tokens = [
    ["TWILIO_PHONE_VERIFY", TWILIO_PHONE_VERIFY],
    ["TWILIO_TEJAAS", TWILIO_TEJAAS],
    ["TWILIO_TEJAS", TWILIO_TEJAS],
    ["TWILIO_AUTH_TOKEN", TWILIO_AUTH_TOKEN],
  ].filter(([, token], index, allTokens) => {
    return (
      token && allTokens.findIndex(([, value]) => value === token) === index
    );
  });

  return { accountSid, tokens, verifyServiceSid: TWILIO_VERIFY_SERVICE_SID };
}

async function validateOtpAuthType(req, res, phone, options = {}) {
  const authType = req.headers["x-auth-type"];

  if (authType !== "login" && authType !== "register") {
    res.status(400).json({
      message: "x-auth-type header must be either 'login' or 'register'",
    });
    return false;
  }

  const existingUser = await User.findOne({ phone });

  if (authType === "login") {
    if (!existingUser) {
      res.status(404).json({
        message:
          options.loginNotFoundMessage ||
          "No account found with this phone number. Please register first.",
      });
      return false;
    }
    if (existingUser.is_blocked) {
      res.status(403).json({ message: "Your account has been blocked." });
      return false;
    }
  }

  if (authType === "register" && existingUser) {
    if (existingUser.is_blocked) {
      res.status(403).json({ message: "Your account has been blocked." });
      return false;
    }
  }

  return true;
}

const getToken = (req, res) => {
  try {
    const {
      TWILIO_ACCOUNT_SID,
      TWILIO_API_KEY,
      TWILIO_API_SECRET,
      TWILIO_TWIML_APP_SID,
    } = process.env;

    // Validate required env vars
    if (
      !TWILIO_ACCOUNT_SID ||
      !TWILIO_API_KEY ||
      !TWILIO_API_SECRET ||
      !TWILIO_TWIML_APP_SID
    ) {
      console.error("[getToken] Missing required Twilio environment variables");
      return res
        .status(500)
        .json({ message: "Twilio configuration is incomplete on the server" });
    }

    // Use provided identity or auto-generate one
    let identity = req.body && req.body.identity;
    if (identity !== undefined) {
      // If caller explicitly supplied an identity, validate it
      if (typeof identity !== "string" || !isValidClientIdentity(identity)) {
        return res.status(400).json({
          message:
            "Invalid identity: must be 1–128 alphanumeric characters, underscores, or hyphens",
        });
      }
    } else {
      identity = generateIdentity();
    }

    // Create Access Token (TTL = 3600 s)
    const token = new AccessToken(
      TWILIO_ACCOUNT_SID,
      TWILIO_API_KEY,
      TWILIO_API_SECRET,
      {
        identity,
        ttl: 3600,
      },
    );

    // Create Voice Grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: TWILIO_TWIML_APP_SID,
      incomingAllow: true,
    });

    token.addGrant(voiceGrant);

    const jwt = token.toJwt();

    return res.status(200).json({ token: jwt, identity });
  } catch (error) {
    console.error("[getToken]", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const handleVoice = (req, res) => {
  try {
    const { TWILIO_PHONE_NUMBER } = process.env;

    if (!TWILIO_PHONE_NUMBER) {
      console.error("[handleVoice] TWILIO_PHONE_NUMBER env var is not set");
      return res
        .status(200)
        .type("text/xml")
        .send(
          "<Response><Say>Server configuration error. Please contact support.</Say></Response>",
        );
    }

    // Twilio sends params in body (urlencoded) or occasionally as query params.
    const params = Object.assign({}, req.query || {}, req.body || {});
    const to = params.To || params.to || params.phone || params.PhoneNumber;

    // Validate: To must be present
    if (!to || typeof to !== "string" || to.trim() === "") {
      return sendTwimlError(res, 400, "Missing destination number.");
    }

    const trimmedTo = to.trim();
    const phoneTo = normalizePhoneNumber(trimmedTo);
    const twiml = new VoiceResponse();

    if (phoneTo) {
      // ---- Phone number call ----
      const dial = twiml.dial({ callerId: TWILIO_PHONE_NUMBER, answerOnBridge: true });
      dial.number(phoneTo);
    } else {
      // ---- Browser-to-browser (client) call ----
      if (!isValidClientIdentity(trimmedTo)) {
        return sendTwimlError(
          res,
          400,
          "Invalid destination. Enter a valid phone number or client identity.",
        );
      }

      const dial = twiml.dial({ answerOnBridge: true });
      dial.client(trimmedTo);
    }

    res.set("Content-Type", "text/xml");
    return res.status(200).send(twiml.toString());
  } catch (error) {
    console.error("[handleVoice]", error);
    // Return a valid TwiML error response so Twilio doesn't retry indefinitely
    res.set("Content-Type", "text/xml");
    return res
      .status(200)
      .send(
        "<Response><Say>An internal error occurred. Please try again later.</Say></Response>",
      );
  }
};

const sendOtp = async (req, res) => {
  try {
    const {
      TWILIO_ACCOUNT_SID,
      TWILIO_PHONE_VERIFY_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_VERIFY,
      TWILIO_TEJAAS,
      TWILIO_TEJAS,
      TWILIO_VERIFY_SERVICE_SID,
    } = process.env;

    const twilioAccountSid = TWILIO_PHONE_VERIFY_SID || TWILIO_ACCOUNT_SID;

    const twilioAuthToken =
      TWILIO_PHONE_VERIFY || TWILIO_TEJAAS || TWILIO_TEJAS || TWILIO_AUTH_TOKEN;

    console.log(`[sendOtp] Using Account SID: ${twilioAccountSid}, Verify Service SID: ${TWILIO_VERIFY_SERVICE_SID}`);
    if (TWILIO_PHONE_VERIFY_SID) {
      console.log(`[sendOtp] Note: TWILIO_PHONE_VERIFY_SID is overriding TWILIO_ACCOUNT_SID`);
    }

    if (!twilioAccountSid || !twilioAuthToken || !TWILIO_VERIFY_SERVICE_SID) {
      console.error("[sendOtp] Missing Twilio Verify configuration");
      return res.status(500).json({
        message: "Twilio OTP verification is not configured on the server",
      });
    }

    const phone = normalizePhoneNumber(req.body && req.body.phone);
    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const isAuthTypeValid = await validateOtpAuthType(req, res, phone);
    if (!isAuthTypeValid) {
      return;
    }

    const client = twilio(twilioAccountSid, twilioAuthToken);

    const verification = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: phone, channel: "sms" });

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      sid: verification.sid,
    });
  } catch (error) {
    console.error("[sendOtp]", error);
    return res
      .status(500)
      .json({ message: error.message || "Failed to send OTP" });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { JWT_SECRET, JWT_EXPIRES_IN } = process.env;

    const { accountSid, tokens, verifyServiceSid } =
      getTwilioVerifyCredentials();

    if (!accountSid || tokens.length === 0 || !verifyServiceSid) {
      console.error("[verifyOtp] Missing Twilio Verify configuration");
      return res.status(500).json({
        message: "Twilio OTP verification is not configured on the server",
      });
    }

    const { code, role, name } = req.body || {};
    const phone = normalizePhoneNumber(req.body && req.body.phone);

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }
    if (!code || typeof code !== "string") {
      return res.status(400).json({ message: "OTP code is required" });
    }

    const isAuthTypeValid = await validateOtpAuthType(req, res, phone, {
      loginNotFoundMessage: "No account found with this phone number.",
      registerExistsMessage:
        "An account with this phone number already exists.",
    });
    if (!isAuthTypeValid) {
      return;
    }

    let check;
    let lastError;
    let serviceNotFoundError;

    for (const [tokenName, authToken] of tokens) {
      try {
        const client = twilio(accountSid, authToken);
        check = await client.verify.v2
          .services(verifyServiceSid)
          .verificationChecks.create({ to: phone, code: code.trim() });
        break;
      } catch (error) {
        lastError = error;
        if (error.code === 20404) {
          serviceNotFoundError = error;
          console.error(
            `[verifyOtp] Verify service not found using ${tokenName}; trying next Twilio token`,
          );
          continue;
        }
        if (error.code === 20003 && serviceNotFoundError) {
          console.error(
            `[verifyOtp] Authentication failed using ${tokenName}; keeping Verify service error`,
          );
          continue;
        }
        if (error.code !== 20404) {
          throw error;
        }
      }
    }

    if (!check) {
      throw serviceNotFoundError || lastError;
    }

    if (check.status !== "approved") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP code" });
    }

    // OTP is verified! Now handle user login or sign up
    let user = await User.findOne({ phone });
    let isNew = false;

    if (!user) {
      // Create user since they verified for the first time
      isNew = true;
      let assignedRole = "user";
      if (role === "businessOwner") {
        assignedRole = role;
      }

      user = await User.create({
        firebase_uid: "otp_" + phone.replace("+", ""),
        name: name || "",
        phone: phone,
        role: assignedRole,
        is_blocked: false,
      });
    } else {
      if (user.is_blocked) {
        return res.status(403).json({
          message: "Your account has been blocked",
          is_blocked: true,
        });
      }
      if (role) {
        if (
          (user.role === "user" && role === "businessOwner") ||
          (user.role === "businessOwner" && role === "user")
        ) {
          user.role = "both";
          await user.save();
        }
      }
    }

    // Generate JWT
    const payload = {
      _id: user._id.toString(),
      id: user._id.toString(),
      userId: user._id.toString(),
      uid: user.firebase_uid,
      firebase_uid: user.firebase_uid,
      role: user.role,
    };

    const signToken = jwt.sign(
      payload,
      JWT_SECRET || "your-long-random-secret",
      {
        expiresIn: JWT_EXPIRES_IN || "7d",
      },
    );

    res.set("Authorization", `Bearer ${signToken}`);

    return res.status(200).json({
      success: true,
      user,
      token: signToken,
      jwtToken: signToken,
      accessToken: signToken,
      authType: "jwt",
      isNew,
      message: isNew ? "Registration successful" : "Login successful",
    });
  } catch (error) {
    console.error("[verifyOtp]", error);
    if (error.code === 20404) {
      return res.status(500).json({
        message:
          "Twilio Verify Service was not found. Create a Verify Service in the TWILIO_PHONE_VERIFY_SID account and set TWILIO_VERIFY_SERVICE_SID to that VA SID.",
      });
    }
    return res
      .status(500)
      .json({ message: error.message || "Verification failed" });
  }
};

const getCallStatus = async (req, res) => {
  try {
    const { callSid } = req.body;
    if (!callSid) {
      return res.status(400).json({ message: "Call SID is required" });
    }

    const {
      TWILIO_ACCOUNT_SID,
      TWILIO_PHONE_VERIFY_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_VERIFY,
      TWILIO_TEJAAS,
      TWILIO_TEJAS,
    } = process.env;

    const twilioAccountSid = TWILIO_PHONE_VERIFY_SID || TWILIO_ACCOUNT_SID;
    const twilioAuthToken =
      TWILIO_PHONE_VERIFY || TWILIO_TEJAAS || TWILIO_TEJAS || TWILIO_AUTH_TOKEN;

    const client = twilio(twilioAccountSid, twilioAuthToken);
    const call = await client.calls(callSid).fetch();

    return res.status(200).json({ status: call.status });
  } catch (error) {
    console.error("[getCallStatus] error:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch call status" });
  }
};

module.exports = { getToken, handleVoice, sendOtp, verifyOtp, getCallStatus };
