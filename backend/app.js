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
// CORS configuration
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
  })
);
// const allowedOrigins = [
//   process.env.FRONTEND_URL, // Your production frontend URL (to be set later)
//   "http://localhost:5173", // Vite default
//   "http://localhost:3000", // React default
//   "http://localhost:8080", // Another common development port
//   "null", // For local file testing
// ];

// // Filter out undefined values
// const validOrigins = allowedOrigins.filter((origin) => origin);

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       // Allow requests with no origin (like mobile apps or curl)
//       if (!origin) return callback(null, true);

//       if (validOrigins.indexOf(origin) === -1) {
//         // For development purposes, you can make this less strict
//         if (process.env.NODE_ENV === "development") {
//           return callback(null, true); // Allow all origins in development
//         }

//         const msg =
//           "The CORS policy for this site does not allow access from the specified Origin.";
//         return callback(new Error(msg), false);
//       }
//       return callback(null, true);
//     },
//     methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
//     credentials: true,
//     preflightContinue: false,
//     optionsSuccessStatus: 204,
//   })
// );

// // Handle OPTIONS requests
// app.options("*", cors());

app.use("/api/auth", express.json());
app.use("/api/users", express.json());
app.use("/api/assignments", express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(morgan("dev"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/blobs", blobRoutes);

app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

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
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
