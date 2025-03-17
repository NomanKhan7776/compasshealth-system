// routes/auth.js
const express = require("express");
const router = express.Router();
const {
  login,
  register,
  getCurrentUser,
} = require("../controllers/authController");
const auth = require("../middleware/auth");
const { checkRole } = require("../middleware/role-check");

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", login);

// @route   POST api/auth/register
// @desc    Register a new user
// @access  Private/Admin
router.post("/register", auth, checkRole(["admin"]), register);

router.get("/me", auth, getCurrentUser);

module.exports = router;
