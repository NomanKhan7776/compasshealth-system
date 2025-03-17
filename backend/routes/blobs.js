// routes/blobs.js
const express = require("express");
const router = express.Router();

const {
  getBlobs,
  getBlobSasUrl,
  uploadBlob,
  deleteBlob,
  getAuditLogs,
} = require("../controllers/blobController.js");
const auth = require("../middleware/auth.js");
const { checkRole } = require("../middleware/role-check.js");


// @route   GET api/blobs/:containerName/:folderName
// @desc    Get all blobs in a folder
// @access  Private
router.get("/:containerName/:folderName", auth, getBlobs);

// @route   GET api/blobs/:containerName/:folderName/:blobName/url
// @desc    Get SAS URL for a blob
// @access  Private
router.get("/:containerName/:folderName/:blobName/url", auth, getBlobSasUrl);

// @route   POST api/blobs/:containerName/:folderName
// @desc    Upload a blob
// @access  Private/Admin,Doctor,Nurse
router.post(
  "/:containerName/:folderName",
  auth,
  checkRole(["admin", "doctor", "nurse"]),
  uploadBlob
);

// @route   DELETE api/blobs/:containerName/:folderName/:blobName
// @desc    Delete a blob
// @access  Private/Admin
router.delete(
  "/:containerName/:folderName/:blobName",
  auth,
  checkRole(["admin"]),
  deleteBlob
);

router.get("/audit", auth, checkRole(["admin"]), getAuditLogs);

module.exports = router;
