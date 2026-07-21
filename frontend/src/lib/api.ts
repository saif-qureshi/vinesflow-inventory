import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

import { useSessionStore } from "@/stores/session";
import type { ApiEnvelope } from "@/types";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8005/api/v1";

function unwrap(res: AxiosResponse): AxiosResponse {
  const body = res.data;
  if (body && typeof body === "object" && "success" in body && "data" in body) {
    res.data = (body as ApiEnvelope<unknown>).data;
  }
  return res;
}

export const api = axios.create({ baseURL, withCredentials: true });

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const headers = AxiosHeaders.from(config.headers);
  const { accessToken, currentOrgId } = useSessionStore.getState();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (currentOrgId) headers.set("X-Org-Id", String(currentOrgId));
  config.headers = headers;
  return config;
});

const refreshClient = axios.create({ baseURL, withCredentials: true });
let refreshing: Promise<string | null> | null = null;

export async function requestAccessToken(): Promise<string | null> {
  try {
    const res = await refreshClient.post("/auth/refresh");
    const token = unwrap(res).data?.access_token as string | undefined;
    if (token) {
      useSessionStore.getState().setAccessToken(token);
      return token;
    }
  } catch {
    // fall through
  }
  useSessionStore.getState().clear();
  return null;
}

api.interceptors.response.use(
  (res) => unwrap(res),
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const status = error.response?.status;
    const url = original?.url ?? "";
    const isAuthCall = url.includes("/auth/login") || url.includes("/auth/refresh");

    if (status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      refreshing = refreshing ?? requestAccessToken();
      const token = await refreshing;
      refreshing = null;
      if (token) {
        const headers = AxiosHeaders.from(original.headers);
        headers.set("Authorization", `Bearer ${token}`);
        original.headers = headers;
        return api(original);
      }
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(error)) {
    const envelope = error.response?.data as ApiEnvelope<unknown> | undefined;
    const err = envelope?.error;
    if (err?.message) {
      if (Array.isArray(err.details) && err.details[0]?.msg) return err.details[0].msg as string;
      return err.message;
    }
  }
  return fallback;
}
