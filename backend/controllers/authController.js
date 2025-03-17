// controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool, sql } = require("../config/database");

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    await pool.connect();

    // Check if user exists
    const result = await pool
      .request()
      .input("username", username)
      .query("SELECT * FROM Users WHERE username = @username");

    if (result.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const user = result.recordset[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Create JWT payload
    const payload = {
      user: {
        id: user.userId,
        role: user.role,
      },
    };

    // Sign token
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
      (err, token) => {
        if (err) throw err;
        res.json({
          success: true,
          token,
          user: {
            id: user.userId,
            name: user.name,
            username: user.username,
            role: user.role,
          },
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @route   POST api/auth/register
// @desc    Register a new user
// @access  Private/Admin
exports.register = async (req, res) => {
  const { name, username, password, role } = req.body;

  // Validate role
  if (!["doctor", "nurse", "assistant"].includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Invalid role",
    });
  }

  try {
    await pool.connect();

    // Check if username already exists
    const userCheck = await pool
      .request()
      .input("username", username)
      .query("SELECT * FROM Users WHERE username = @username");

    if (userCheck.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Username already exists",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new user
    const result = await pool
      .request()
      .input("name", name)
      .input("username", username)
      .input("password", hashedPassword)
      .input("role", role).query(`
        INSERT INTO Users (name, username, password, role)
        OUTPUT INSERTED.userId, INSERTED.name, INSERTED.username, INSERTED.role
        VALUES (@name, @username, @password, @role)
      `);

    const user = result.recordset[0];

    res.status(201).json({
      success: true,
      user,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    // This route is protected by auth middleware,
    // so req.user is already verified and available
    res.json({
      success: true,
      user: {
        userId: req.user.userId,
        name: req.user.name,
        username: req.user.username,
        role: req.user.role,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
