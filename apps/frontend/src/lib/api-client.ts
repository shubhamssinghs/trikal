import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8310";

export const apiClient = axios.create({
  baseURL: `${baseURL}/api/v1`,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) { /* handle unauthorized */ }
    return Promise.reject(error);
  }
);
