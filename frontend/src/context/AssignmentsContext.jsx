import React, { useState, useCallback, useEffect } from "react";
import { assignmentsAPI, blobsAPI } from "../api";
import { AssignmentsContext } from "../hooks/useAssignments";

export const AssignmentsProvider = ({ children }) => {
  const [assignmentsData, setAssignmentsData] = useState([]);
  const [folderStats, setFolderStats] = useState({});
  const [summaryStats, setSummaryStats] = useState({
    totalFiles: 0,
    fileTypes: {},
    containerCount: 0,
    folderCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);
  const [error, setError] = useState("");
  const [hasAssignments, setHasAssignments] = useState(null);

  // Helper to get file extension
  const getFileExtension = (filename) => {
    return (
      filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2) || "none"
    );
  };

  // New function to check if user has any assignments (lightweight)
  const checkHasAssignments = useCallback(async () => {
    // Don't make API calls if there's no token
    if (!localStorage.getItem("token")) {
      return false;
    }

    // Skip if we already know
    if (hasAssignments !== null) {
      return hasAssignments;
    }

    try {
      setLoading(true);

      // Make API call to check assignments
      const assignmentsRes = await assignmentsAPI.getMyAssignments();
      const assignments = assignmentsRes.data.assignments || [];

      // Set the flag based on whether assignments exist
      const hasAny = assignments.length > 0;
      setHasAssignments(hasAny);

      // If there are assignments, also store them to avoid duplicate calls
      if (hasAny) {
        setAssignmentsData(assignments);
        setLastFetched(new Date());

        // Calculate initial counts
        const containerCount = assignments.length;
        const folderCount = assignments.reduce(
          (total, container) => total + container.folders.length,
          0
        );

        // Update summary with initial counts
        setSummaryStats((prev) => ({
          ...prev,
          containerCount,
          folderCount,
        }));
      }

      setLoading(false);
      return hasAny;
    } catch (err) {
      console.error("Failed to check assignments:", err);
      setLoading(false);
      return false;
    }
  }, [hasAssignments]);

  // Initialize on component mount
  useEffect(() => {
    checkHasAssignments();
  }, [checkHasAssignments]);

  // Fetch assignments data
  const fetchAssignments = useCallback(
    async (forceRefresh = false) => {
      if (!localStorage.getItem("token")) {
        return { assignmentsData: [], summaryStats, folderStats };
      }
      // First check if user has any assignments
      if (!forceRefresh) {
        const userHasAssignments = await checkHasAssignments();
        if (!userHasAssignments) {
          return { assignmentsData: [], summaryStats, folderStats };
        }
      }

      // If we have data and it's less than 5 minutes old, don't refetch unless forced
      const dataAge = lastFetched
        ? (new Date() - lastFetched) / 1000 / 60
        : 999;
      if (assignmentsData.length > 0 && dataAge < 5 && !forceRefresh) {
        return { assignmentsData, summaryStats, folderStats };
      }

      try {
        setLoading(true);
        setError("");

        // Get user assignments
        const assignmentsRes = await assignmentsAPI.getMyAssignments();
        const assignments = assignmentsRes.data.assignments || [];
        setAssignmentsData(assignments);

        // Update the hasAssignments flag
        setHasAssignments(assignments.length > 0);

        // Calculate initial counts
        const containerCount = assignments.length;
        const folderCount = assignments.reduce(
          (total, container) => total + container.folders.length,
          0
        );

        // Update summary with initial counts
        setSummaryStats((prev) => ({
          ...prev,
          containerCount,
          folderCount,
        }));

        setLoading(false);
        setLastFetched(new Date());

        // Only fetch stats if there are assignments
        if (assignments.length > 0) {
          fetchFileStats(assignments);
        }

        return { assignmentsData: assignments, summaryStats, folderStats };
      } catch (err) {
        setError("Failed to load assignments data");
        console.error(err);
        setLoading(false);
        return { error: err.message };
      }
    },
    [
      assignmentsData,
      lastFetched,
      folderStats,
      summaryStats,
      checkHasAssignments,
    ]
  );

  // Fetch file statistics for assignments
  const fetchFileStats = async (assignments) => {
    setLoadingStats(true);

    const stats = {};
    let totalFiles = 0;
    const aggregateFileTypes = {};

    // Process in small batches to avoid overwhelming the API
    const batchSize = 5;
    const folders = [];

    // Build a flat list of all folders
    assignments.forEach((container) => {
      container.folders.forEach((folder) => {
        folders.push({
          containerName: container.containerName,
          folderName: folder.folderName,
        });
      });
    });

    // Process folders in batches
    for (let i = 0; i < folders.length; i += batchSize) {
      const batch = folders.slice(i, i + batchSize);

      // Fetch all folders in this batch in parallel
      await Promise.all(
        batch.map(async ({ containerName, folderName }) => {
          const folderKey = `${containerName}/${folderName}`;

          try {
            const blobsRes = await blobsAPI.getBlobs(containerName, folderName);
            const blobs = blobsRes.data.blobs || [];

            // Count files by type
            const fileTypes = {};
            blobs.forEach((blob) => {
              const extension = getFileExtension(blob.name).toLowerCase();
              fileTypes[extension] = (fileTypes[extension] || 0) + 1;

              // Update aggregate counts
              totalFiles++;
              aggregateFileTypes[extension] =
                (aggregateFileTypes[extension] || 0) + 1;
            });

            stats[folderKey] = {
              totalFiles: blobs.length,
              fileTypes,
            };

            // Update stats incrementally to show progress
            setFolderStats((prevStats) => ({
              ...prevStats,
              [folderKey]: { totalFiles: blobs.length, fileTypes },
            }));

            setSummaryStats((prev) => ({
              ...prev,
              totalFiles,
              fileTypes: aggregateFileTypes,
            }));
          } catch (err) {
            console.error(`Error fetching blobs for ${folderKey}:`, err);
            stats[folderKey] = { totalFiles: 0, fileTypes: {} };
          }
        })
      );

      // Small delay to prevent overwhelming the server
      if (i + batchSize < folders.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    setLoadingStats(false);
  };

  const value = {
    assignmentsData,
    folderStats,
    summaryStats,
    loading,
    loadingStats,
    error,
    fetchAssignments,
    lastFetched,
    hasAssignments,
    checkHasAssignments,
  };

  return (
    <AssignmentsContext.Provider value={value}>
      {children}
    </AssignmentsContext.Provider>
  );
};
