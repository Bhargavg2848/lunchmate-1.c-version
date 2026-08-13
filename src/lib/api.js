import axios from "axios";

// Uses your Vite environment variable, or defaults to local FastAPI testing
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  withCredentials: true, // Crucial for sending the secure session cookies
});

export default api;
