import React, { useState, useEffect } from "react";
import { authAPI } from "../api";
import { AuthContext } from "../hooks/useAuth";

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // This function will handle parsing the token consistently
  const parseUserFromToken = (token) => {
    try {
      // Split the token
      const parts = token.split(".");
      if (parts.length !== 3) {
        console.error("Invalid token format");
        return null;
      }

      // Decode the payload part (middle part)
      const payload = parts[1];
      // Base64 decode
      const decodedPayload = atob(
        payload.replace(/-/g, "+").replace(/_/g, "/")
      );
      const tokenData = JSON.parse(decodedPayload);

      // Check if the expected user data exists
      if (!tokenData.user) {
        console.error("No user data in token");
        return null;
      }

      // Return a properly formatted user object that matches what your app expects
      return {
        id: tokenData.user.userId || tokenData.user.id, // Handle both formats
        role: tokenData.user.role,
        name: tokenData.user.name || "User", // Fallback
        username: tokenData.user.username,
      };
    } catch (e) {
      console.error("Error parsing token:", e);
      return null;
    }
  };

  // Load user from token on initial render
  useEffect(() => {
    const loadUserFromToken = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // First parse the token to set initial user state quickly
        const parsedUser = parseUserFromToken(token);
        if (parsedUser) {
          setCurrentUser(parsedUser);
        }

        // Then verify the token with the server
        const response = await authAPI.getCurrentUser();

        // Update with server-verified data
        setCurrentUser({
          id: response.data.user.userId || response.data.user.id,
          role: response.data.user.role,
          name: response.data.user.name,
          username: response.data.user.username,
        });
      } catch (err) {
        // If server validation fails, clear the token and user state
        console.error("Token validation failed:", err);
        localStorage.removeItem("token");
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUserFromToken();
  }, []);

  const login = async (username, password) => {
    try {
      setError(null);
      const response = await authAPI.login(username, password);

      const { token, user } = response.data;

      // Store the token
      localStorage.setItem("token", token);

      // IMPORTANT: Set the current user with a structure that matches parseUserFromToken
      // This ensures consistency between direct login and refresh
      setCurrentUser({
        id: user.userId || user.id, // Handle both formats
        role: user.role,
        name: user.name || username, // Fallback to username
        username: user.username || username,
      });

      return user;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to login");
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setCurrentUser(null);
  };

  const isAdmin = () => {
    return currentUser?.role === "admin";
  };

  const isDoctor = () => {
    return currentUser?.role === "doctor";
  };

  const isNurse = () => {
    return currentUser?.role === "nurse";
  };

  const isAssistant = () => {
    return currentUser?.role === "assistant";
  };

  const value = {
    currentUser,
    loading,
    error,
    login,
    logout,
    isAdmin,
    isDoctor,
    isNurse,
    isAssistant,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
