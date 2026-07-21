/**
 * Centralized API & WebSocket configuration for BreachSimu Frontend
 */

/**
 * Resolves the backend HTTP API Base URL.
 * Priorities:
 * 1. import.meta.env.VITE_API_BASE_URL (e.g. "https://breach-simu-api.onrender.com")
 * 2. Fallback to current window location in development/local mode
 */
export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim() !== "") {
    return envUrl.trim().replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.host}`;
  }
  return "http://localhost:8000";
};

/**
 * Resolves the backend WebSocket URL endpoint.
 * Priorities:
 * 1. import.meta.env.VITE_WS_BASE_URL (e.g. "wss://breach-simu-api.onrender.com/ws")
 * 2. Derived from VITE_API_BASE_URL
 * 3. Fallback to current window location
 */
export const getWsBaseUrl = () => {
  const envWsUrl = import.meta.env.VITE_WS_BASE_URL;
  if (envWsUrl && envWsUrl.trim() !== "") {
    return envWsUrl.trim().replace(/\/+$/, "");
  }

  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  if (envApiUrl && envApiUrl.trim() !== "") {
    const cleanUrl = envApiUrl.trim().replace(/\/+$/, "");
    const wsProtocol = cleanUrl.startsWith("https") ? "wss:" : "ws:";
    const host = cleanUrl.replace(/^https?:\/\//, "");
    return `${wsProtocol}//${host}/ws`;
  }

  if (typeof window !== "undefined") {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProtocol}//${window.location.host}/ws`;
  }

  return "ws://localhost:8000/ws";
};
