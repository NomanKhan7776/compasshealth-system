// controllers/blobController.js
const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} = require("@azure/storage-blob");
const { blobServiceClient } = require("../config/azure-storage");
const { pool, sql } = require("../config/database");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

// Configure multer for file uploads
const upload = multer({ dest: "uploads/" });

// Configure multer to use memory storage instead of disk storage
// const memoryStorage = multer.memoryStorage();
// const upload = multer({
//   storage: memoryStorage,
//   limits: {
//     fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
//   },
// });

// Helper function to log file operations for audit trail
const logFileOperation = async (
  userId,
  containerName,
  folderName,
  blobName,
  operation
) => {
  try {
    await pool.connect();

    await pool
      .request()
      .input("userId", userId)
      .input("containerName", containerName)
      .input("folderName", folderName)
      .input("blobName", blobName)
      .input("operation", operation).query(`
        INSERT INTO FileAudit (userId, containerName, folderName, blobName, operation)
        VALUES (@userId, @containerName, @folderName, @blobName, @operation)
      `);
  } catch (err) {
    console.error("Error logging file operation:", err.message);
    // Don't throw error - this is a non-critical operation
  }
};

// Helper function to check if user has access to container/folder
const checkUserAccess = async (userId, containerName, folderName) => {
  // Admin has access to everything
  const userResult = await pool
    .request()
    .input("id", userId)
    .query("SELECT role FROM Users WHERE userId = @id");

  if (userResult.recordset[0].role === "admin") {
    return true;
  }

  // Check container assignment
  const containerResult = await pool
    .request()
    .input("userId", userId)
    .input("containerName", containerName)
    .query(
      "SELECT * FROM ContainerAssignments WHERE userId = @userId AND containerName = @containerName"
    );

  if (containerResult.recordset.length === 0) {
    return false;
  }

  // If folderName is provided, check folder assignment
  if (folderName) {
    const folderResult = await pool
      .request()
      .input("userId", userId)
      .input("containerName", containerName)
      .input("folderName", folderName)
      .query(
        "SELECT * FROM FolderAssignments WHERE userId = @userId AND containerName = @containerName AND folderName = @folderName"
      );

    if (folderResult.recordset.length === 0) {
      return false;
    }
  }

  return true;
};

// Helper function to generate SAS token based on user role
const generateSasToken = (containerName, blobName, userRole) => {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

  const sharedKeyCredential = new StorageSharedKeyCredential(
    accountName,
    accountKey
  );

  // Set permissions based on user role
  let permissions;

  switch (userRole) {
    case "admin":
      permissions = BlobSASPermissions.parse("racwd"); // Full permissions
      break;
    case "doctor":
    case "nurse":
      permissions = BlobSASPermissions.parse("rcw"); // Read, Create, Write
      break;
    case "assistant":
    default:
      permissions = BlobSASPermissions.parse("r"); // Read-only
      break;
  }

  const sasOptions = {
    containerName,
    blobName,
    permissions: permissions,
    startsOn: new Date(),
    expiresOn: new Date(new Date().valueOf() + 3600 * 1000), // 1 hour
  };

  const sasToken = generateBlobSASQueryParameters(
    sasOptions,
    sharedKeyCredential
  ).toString();

  return sasToken;
};

// @route   GET api/blobs/:containerName/:folderName
// @desc    Get all blobs in a folder
// @access  Private
exports.getBlobs = async (req, res) => {
  try {
    const { containerName, folderName } = req.params;

    await pool.connect();

    // Check if user has access
    const hasAccess = await checkUserAccess(
      req.user.userId,
      containerName,
      folderName
    );
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Get container client
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Check if container exists
    const containerExists = await containerClient.exists();
    if (!containerExists) {
      return res.status(404).json({
        success: false,
        message: "Container not found",
      });
    }

    // List blobs in folder
    const blobs = [];
    const folderPrefix = `${folderName}/`;
    const blobIterator = containerClient.listBlobsFlat({
      prefix: folderPrefix,
    });

    for await (const blob of blobIterator) {
      // Skip the folder itself (if it exists as a blob)
      if (blob.name === folderPrefix) {
        continue;
      }

      // Get blob name (without folder prefix)
      const blobName = blob.name.replace(folderPrefix, "");

      blobs.push({
        name: blobName,
        fullPath: blob.name,
        contentType: blob.properties.contentType,
        contentLength: blob.properties.contentLength,
        createdOn: blob.properties.createdOn,
        lastModified: blob.properties.lastModified,
      });
    }

    // Log the list operation for audit
    await logFileOperation(
      req.user.userId,
      containerName,
      folderName,
      "FOLDER_LISTING",
      "LIST"
    );

    res.json({
      success: true,
      containerName,
      folderName,
      blobs,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @route   GET api/blobs/:containerName/:folderName/:blobName/url
// @desc    Get SAS URL for a blob
// @access  Private
exports.getBlobSasUrl = async (req, res) => {
  try {
    const { containerName, folderName, blobName } = req.params;

    await pool.connect();

    // Check if user has access
    const hasAccess = await checkUserAccess(
      req.user.userId,
      containerName,
      folderName
    );
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Get container client
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Check if container exists
    const containerExists = await containerClient.exists();
    if (!containerExists) {
      return res.status(404).json({
        success: false,
        message: "Container not found",
      });
    }

    // Get blob client
    const fullBlobName = `${folderName}/${blobName}`;
    const blobClient = containerClient.getBlobClient(fullBlobName);

    // Check if blob exists
    const blobExists = await blobClient.exists();
    if (!blobExists) {
      return res.status(404).json({
        success: false,
        message: "Blob not found",
      });
    }

    // Generate SAS token with permissions based on user role
    const sasToken = generateSasToken(
      containerName,
      fullBlobName,
      req.user.role
    );
    const sasUrl = `${blobClient.url}?${sasToken}`;

    // Log the download operation for audit
    await logFileOperation(
      req.user.userId,
      containerName,
      folderName,
      blobName,
      "DOWNLOAD"
    );

    res.json({
      success: true,
      sasUrl,
      canModify: req.user.role === "admin",
      canUpload: ["admin", "doctor", "nurse"].includes(req.user.role),
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
// @route   POST api/blobs/:containerName/:folderName
// @desc    Upload a blob
// @access  Private/Admin,Doctor,Nurse
exports.uploadBlob = async (req, res) => {
  // Use multer middleware to handle file upload
  upload.single("file")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: "File upload error: " + err.message,
      });
    }

    // console.log("File upload request received", req.file);

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    try {
      const { containerName, folderName } = req.params;
      const { filename } = req.body;

      // console.log("Processing file upload with params:", {
      //   containerName,
      //   folderName,
      // });

      // Check if user has access to this folder
      const hasAccess = await checkUserAccess(
        req.user.userId,
        containerName,
        folderName
      );
      if (!hasAccess) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Get container client
      const containerClient =
        blobServiceClient.getContainerClient(containerName);

      // Check if container exists
      const containerExists = await containerClient.exists();
      if (!containerExists) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        return res.status(404).json({
          success: false,
          message: "Container not found",
        });
      }

      // Generate blob name
      const blobName = filename || `${uuidv4()}-${req.file.originalname}`;
      const fullBlobName = `${folderName}/${blobName}`;

      // Get blob client
      const blobClient = containerClient.getBlobClient(fullBlobName);
      const blockBlobClient = blobClient.getBlockBlobClient();

      // Upload file
      const fileContent = fs.readFileSync(req.file.path);
      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: req.file.mimetype,
        },
      };

      await blockBlobClient.uploadData(fileContent, uploadOptions);

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      // Log the upload operation for audit
      await logFileOperation(
        req.user.userId,
        containerName,
        folderName,
        blobName,
        "UPLOAD"
      );

      res.status(201).json({
        success: true,
        containerName,
        folderName,
        blobName,
        fullPath: fullBlobName,
        contentType: req.file.mimetype,
        size: req.file.size,
        uploadedBy: {
          id: req.user.userId,
          role: req.user.role,
          name: req.user.name,
        },
      });
    } catch (err) {
      // Clean up uploaded file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      console.error("Upload error:", err.message);
      res.status(500).json({
        success: false,
        message: "Server error: " + err.message,
      });
    }
  });
};

// exports.uploadBlob = async (req, res) => {
//   // Use multer middleware to handle file upload
//   upload.single("file")(req, res, async (err) => {
//     if (err) {
//       return res.status(400).json({
//         success: false,
//         message: "File upload error: " + err.message,
//       });
//     }

//     // Check if file was uploaded
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "No file uploaded",
//       });
//     }

//     try {
//       const { containerName, folderName } = req.params;
//       const { filename } = req.body;

//       // Check if user has access to this folder
//       const hasAccess = await checkUserAccess(
//         req.user.userId,
//         containerName,
//         folderName
//       );
//       if (!hasAccess) {
//         return res.status(403).json({
//           success: false,
//           message: "Access denied",
//         });
//       }

//       // Get container client
//       const containerClient =
//         blobServiceClient.getContainerClient(containerName);

//       // Check if container exists
//       const containerExists = await containerClient.exists();
//       if (!containerExists) {
//         return res.status(404).json({
//           success: false,
//           message: "Container not found",
//         });
//       }

//       // Generate blob name
//       const blobName = filename || `${uuidv4()}-${req.file.originalname}`;
//       const fullBlobName = `${folderName}/${blobName}`;

//       // Get blob client
//       const blobClient = containerClient.getBlobClient(fullBlobName);
//       const blockBlobClient = blobClient.getBlockBlobClient();

//       // Upload file - using buffer from memory storage instead of file from disk
//       const uploadOptions = {
//         blobHTTPHeaders: {
//           blobContentType: req.file.mimetype,
//         },
//       };

//       // Upload directly from buffer instead of reading from disk
//       await blockBlobClient.upload(
//         req.file.buffer,
//         req.file.size,
//         uploadOptions
//       );

//       // Log the upload operation for audit
//       await logFileOperation(
//         req.user.userId,
//         containerName,
//         folderName,
//         blobName,
//         "UPLOAD"
//       );

//       res.status(201).json({
//         success: true,
//         containerName,
//         folderName,
//         blobName,
//         fullPath: fullBlobName,
//         contentType: req.file.mimetype,
//         size: req.file.size,
//         uploadedBy: {
//           id: req.user.userId,
//           role: req.user.role,
//           name: req.user.name,
//         },
//       });
//     } catch (err) {
//       console.error("Upload error:", err.message);
//       res.status(500).json({
//         success: false,
//         message: "Server error: " + err.message,
//       });
//     }
//   });
// };

// @route   DELETE api/blobs/:containerName/:folderName/:blobName
// @desc    Delete a blob
// @access  Private/Admin
exports.deleteBlob = async (req, res) => {
  try {
    const { containerName, folderName, blobName } = req.params;

    // Get container client
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Check if container exists
    const containerExists = await containerClient.exists();
    if (!containerExists) {
      return res.status(404).json({
        success: false,
        message: "Container not found",
      });
    }

    // Get blob client
    const fullBlobName = `${folderName}/${blobName}`;
    const blobClient = containerClient.getBlobClient(fullBlobName);

    // Check if blob exists
    const blobExists = await blobClient.exists();
    if (!blobExists) {
      return res.status(404).json({
        success: false,
        message: "Blob not found",
      });
    }

    // Delete the blob
    await blobClient.delete();

    // Log the delete operation for audit
    await logFileOperation(
      req.user.id,
      containerName,
      folderName,
      blobName,
      "DELETE"
    );

    res.json({
      success: true,
      message: "Blob deleted successfully",
      containerName,
      folderName,
      blobName,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @route   GET api/blobs/audit
// @desc    Get audit logs for file operations
// @access  Private/Admin
exports.getAuditLogs = async (req, res) => {
  try {
    const {
      userId,
      containerName,
      folderName,
      operation,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
    } = req.query;

    await pool.connect();

    // Build the query
    let query =
      "SELECT fa.*, u.name, u.username, u.role FROM FileAudit fa JOIN Users u ON fa.userId = u.userId WHERE 1=1";
    const queryParams = [];

    if (userId) {
      query += " AND fa.userId = @userId";
      queryParams.push({ name: "userId", value: parseInt(userId) });
    }

    if (containerName) {
      query += " AND fa.containerName = @containerName";
      queryParams.push({ name: "containerName", value: containerName });
    }

    if (folderName) {
      query += " AND fa.folderName = @folderName";
      queryParams.push({ name: "folderName", value: folderName });
    }

    if (operation) {
      query += " AND fa.operation = @operation";
      queryParams.push({ name: "operation", value: operation });
    }

    if (startDate) {
      query += " AND fa.timestamp >= @startDate";
      queryParams.push({ name: "startDate", value: new Date(startDate) });
    }

    if (endDate) {
      query += " AND fa.timestamp <= @endDate";
      queryParams.push({ name: "endDate", value: new Date(endDate) });
    }

    query +=
      " ORDER BY fa.timestamp DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY";
    queryParams.push({ name: "offset", value: parseInt(offset) });
    queryParams.push({ name: "limit", value: parseInt(limit) });

    // Execute the query
    const request = pool.request();

    // Add parameters to the request
    queryParams.forEach((param) => {
      request.input(param.name, param.value);
    });

    const result = await request.query(query);

    res.json({
      success: true,
      auditLogs: result.recordset,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.recordset.length, // This is not accurate for total count, but sufficient for simple pagination
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
