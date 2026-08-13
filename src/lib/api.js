import axios from "axios";

// Automatically detect environment: if live customer domain, don't fallback to localhost
const isLiveCustomer = window.location.hostname.includes("lunchmate.live") && !window.location.hostname.includes("localhost");

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (isLiveCustomer ? "" : "http://localhost:8000");

const api = axios.create({
  baseURL: BACKEND_URL ? `${BACKEND_URL}/api` : "",
  withCredentials: true,
});

export default api;
