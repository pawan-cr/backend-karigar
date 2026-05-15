const User = require("./userModel");
const bcrypt = require("bcrypt");

// API to create User
const User = async (req, res) => {
  try {
    const { fullname, email, password, phone } = req.body;

    const existingUser = await User.findOne({email})
    if(existingUser){
        return res.status(409).json({
            message : "User Already Exists"
        })
    }
    if (req.file) {
      profile_image = req.file.path;
    }

    const hashedPassword = bcrypt.hash(password, 10);
    const user = await User.create({
      fullname,
      email,
      password: hashedPassword,
      phone,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
