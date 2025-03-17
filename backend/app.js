const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const assignmentRoutes = require("./routes/assignments");
const blobRoutes = require("./routes/blobs");

// Create Express app
const app = express();

// Middleware
// app.use(express.json());
app.use("/api/auth", express.json());
app.use("/api/users", express.json());
app.use("/api/assignments", express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));


// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/blobs", blobRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
