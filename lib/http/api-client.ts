import axios from "axios";
import { normalizeApiError } from "./api-error";

export const apiClient = axios.create({
  headers: {
    Accept: "application/json",
  },
  timeout: 10_000,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  config.headers.set("X-Requested-With", "XMLHttpRequest");
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeApiError(error)),
);
