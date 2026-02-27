import { API_BASE, API_TIMEOUT, ERROR_CODES } from "./constants";
import { getToken, clearAuth, setAccessToken } from "./auth-storage";

/**
 * Redirect to login with optional reason (session_expired / timeout).
 * Caller should clear auth before this when appropriate.
 */
function redirectToLogin(reason?: string) {
  const url = reason ? `/login?reason=${encodeURIComponent(reason)}` : "/login";
  window.location.href = url;
}

/**
 * Enhanced API request with automatic token refresh
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const buildHeaders = (token?: string | null): HeadersInit => ({
    "Content-Type": "application/json",
    ...(token && {
      Authorization: `Bearer ${token}`,
    }),
    ...options.headers,
  });

  const accessToken = getToken();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: buildHeaders(accessToken),
      credentials: "include",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 401: try refresh once, then retry original request.
    if (response.status === 401) {
      // Don't redirect if this is a login attempt - let the caller handle the 401
      if (endpoint.includes("/auth/login")) {
        const data = await response.json().catch(() => ({}));
        const errorMessage = data.message || data.error || "Unauthorized";
        throw new Error(errorMessage);
      }

      // Avoid refresh recursion for refresh endpoint itself.
      if (!endpoint.includes("/auth/refresh")) {
        const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json().catch(() => ({}));
          const refreshedToken = refreshData?.data?.accessToken;

          if (refreshedToken) {
            setAccessToken(refreshedToken);

            const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
              ...options,
              headers: buildHeaders(refreshedToken),
              credentials: "include",
              signal: controller.signal,
            });

            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              return retryData.data;
            }
          }
        }
      }

      clearAuth();
      redirectToLogin("session_expired");
      const data = await response.json().catch(() => ({}));
      const errorMessage = data.message || data.error || "Unauthorized";
      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.message || data.error || "Request failed";
      const error = new Error(errorMessage);
      (error as any).response = {
        data,
        status: response.status,
        code: data.code || ERROR_CODES.SERVER_ERROR,
      };
      throw error;
    }

    return data.data;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      const timeoutError = new Error("Request timeout");
      (timeoutError as any).response = {
        status: 408,
        code: ERROR_CODES.TIMEOUT,
      };
      throw timeoutError;
    }

    // Network errors
    if (
      error.message === "Failed to fetch" ||
      error.message.includes("NetworkError")
    ) {
      const networkError = new Error(
        "Network error. Please check your connection.",
      );
      (networkError as any).response = {
        status: 0,
        code: ERROR_CODES.NETWORK_ERROR,
      };
      throw networkError;
    }

    throw error;
  }
}

export const api = {
  get: <T = any>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: "GET" }),
  post: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  put: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  patch: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: <T = any>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: "DELETE" }),
};
