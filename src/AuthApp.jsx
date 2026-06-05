import React, { useEffect, useMemo, useState } from "react";
import SignlearnApp from "./App.jsx";
import { AuthForm, HeaderActions } from "./components/auth/AuthViews.jsx";
import { AdminDashboard } from "./components/auth/AdminDashboard.jsx";
import { getPostLoginPath, resolveAuthRedirect } from "./app/lib/sessionRouting.js";
import { getApiBaseUrl, getGoogleAuthUrl, getGoogleCallbackExchangeUrl } from "./app/lib/runtimeConfig.js";
import Landing from "./pages/Landing.jsx";

const API_BASE_URL = getApiBaseUrl();
const DEFAULT_GOOGLE_AUTH_URL = getGoogleAuthUrl();
const GOOGLE_CALLBACK_EXCHANGE_URL = getGoogleCallbackExchangeUrl();
const AUTH_STORAGE_KEY = "signlearn.auth.token_pair";

function getCurrentPathname() {
  if (typeof window === "undefined") return "/";
  const path = window.location.pathname || "/";
  if (path === "/") return path;
  return path.replace(/\/+$/, "") || "/";
}

function normalizePath(path) {
  if (!path.startsWith("/")) return `/${path}`;
  return path;
}

function buildApiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = normalizePath(path);
  return `${API_BASE_URL}${normalizedPath}`;
}

function parseApiError(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  if (typeof payload.detail === "string") return payload.detail;
  if (Array.isArray(payload.detail)) {
    const details = payload.detail
      .map((item) => {
        if (!item) return null;
        if (typeof item.msg === "string") return item.msg;
        if (typeof item.message === "string") return item.message;
        return null;
      })
      .filter(Boolean);
    if (details.length > 0) return details.join("; ");
  }
  return fallback;
}

function loadStoredTokenPair() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.access_token || !parsed.refresh_token) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistTokenPair(tokenPair) {
  try {
    if (!tokenPair?.access_token || !tokenPair?.refresh_token) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokenPair));
  } catch {
    // Ignore storage failures (private mode / blocked storage).
  }
}

async function apiRequest(path, { method = "GET", body, accessToken, query } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const url = new URL(buildApiUrl(path), window.location.origin);
  if (query && typeof query === "object") {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  let response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    const networkError = new Error(
      "Không thể kết nối API. Nếu đang chạy local, hãy dùng `npm run dev` và gọi API qua proxy."
    );
    networkError.status = 0;
    networkError.cause = error;
    throw networkError;
  }

  const rawText = await response.text();
  let payload = null;
  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = rawText;
    }
  }

  if (!response.ok) {
    const fallbackMessage = `API lỗi ${response.status}`;
    const error = new Error(parseApiError(payload, fallbackMessage));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function extractCallbackTokenPair() {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const sources = [search, hash];

  for (const params of sources) {
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (accessToken && refreshToken) {
      return {
        tokenPair: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: params.get("token_type") || "bearer",
          expires_in: Number(params.get("expires_in") || 0),
          user: null,
        },
        error: null,
      };
    }
    const oauthError = params.get("error_description") || params.get("error");
    if (oauthError) {
      return { tokenPair: null, authCode: null, error: oauthError };
    }

    const authCode = params.get("code");
    if (authCode) {
      return { tokenPair: null, authCode, error: null };
    }
  }

  return { tokenPair: null, authCode: null, error: null };
}

function cleanAuthParamsFromUrl() {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const keys = ["access_token", "refresh_token", "token_type", "expires_in", "error", "error_description", "code", "state"];
  const hasAuthParams = keys.some((key) => search.has(key) || hash.has(key));
  if (!hasAuthParams) return;
  window.history.replaceState({}, document.title, window.location.pathname);
}

export default function AuthApp() {
  const [status, setStatus] = useState("booting");
  const [mode, setMode] = useState("login");
  const [user, setUser] = useState(null);
  const [tokenPair, setTokenPair] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pathname, setPathname] = useState(() => getCurrentPathname());

  useEffect(() => {
    function handlePopState() {
      setPathname(getCurrentPathname());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigateTo(nextPath, { replace = false } = {}) {
    const normalizedPath = nextPath && nextPath !== "/" ? nextPath.replace(/\/+$/, "") : "/";
    const target = normalizedPath || "/";
    const current = getCurrentPathname();

    if (current !== target) {
      window.history[replace ? "replaceState" : "pushState"]({}, "", target);
    }

    setPathname(target);
  }

  useEffect(() => {
    async function exchangeGoogleCodeForToken(authCode) {
      if (!GOOGLE_CALLBACK_EXCHANGE_URL) {
        const error = new Error(
          "Đã nhận được code Google nhưng chưa cấu hình VITE_GOOGLE_CALLBACK_EXCHANGE_URL."
        );
        error.status = 400;
        throw error;
      }

      if (GOOGLE_CALLBACK_EXCHANGE_URL.includes("{code}")) {
        const callbackUrl = GOOGLE_CALLBACK_EXCHANGE_URL.replace("{code}", encodeURIComponent(authCode));
        return apiRequest(callbackUrl, { method: "GET" });
      }

      return apiRequest(GOOGLE_CALLBACK_EXCHANGE_URL, {
        method: "POST",
        body: { code: authCode },
      });
    }

    async function restoreSession() {
      setStatus("booting");
      const callback = extractCallbackTokenPair();
      cleanAuthParamsFromUrl();
      if (callback.error) setErrorMessage(callback.error);

      let callbackTokenPair = callback.tokenPair;
      if (!callbackTokenPair && callback.authCode) {
        try {
          callbackTokenPair = await exchangeGoogleCodeForToken(callback.authCode);
        } catch (exchangeError) {
          setErrorMessage(exchangeError.message || "Không đổi được mã Google.");
        }
      }

      const storedTokenPair = callbackTokenPair || loadStoredTokenPair();
      if (!storedTokenPair?.access_token) {
        setStatus("signed_out");
        return;
      }

      try {
        const me = await apiRequest("/api/v1/auth/me", { accessToken: storedTokenPair.access_token });
        const nextPair = { ...storedTokenPair, user: me };
        persistTokenPair(nextPair);
        setTokenPair(nextPair);
        setUser(me);
        setStatus("signed_in");
      } catch (error) {
        const canRefresh = (error.status === 401 || error.status === 403) && storedTokenPair.refresh_token;
        if (canRefresh) {
          try {
            const refreshed = await apiRequest("/api/v1/auth/refresh", {
              method: "POST",
              body: { refresh_token: storedTokenPair.refresh_token },
            });
            const me = await apiRequest("/api/v1/auth/me", { accessToken: refreshed.access_token });
            const nextPair = { ...refreshed, user: me };
            persistTokenPair(nextPair);
            setTokenPair(nextPair);
            setUser(me);
            setStatus("signed_in");
            return;
          } catch (refreshError) {
            setErrorMessage(refreshError.message || "Không thể làm mới phiên đăng nhập.");
          }
        } else {
          setErrorMessage(error.message || "Phiên đăng nhập đã hết hạn.");
        }

        setTokenPair(null);
        setUser(null);
        persistTokenPair(null);
        setStatus("signed_out");
      }
    }

    restoreSession();
  }, []);

  async function handleSubmit(formData) {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const endpoint = mode === "register" ? "/api/v1/auth/register" : "/api/v1/auth/login";
      const payload = mode === "register"
        ? { email: formData.email, password: formData.password, full_name: formData.full_name || null }
        : { email: formData.email, password: formData.password };

      const tokenResponse = await apiRequest(endpoint, {
        method: "POST",
        body: payload,
      });

      const me = tokenResponse?.user || (await apiRequest("/api/v1/auth/me", { accessToken: tokenResponse.access_token }));
      const nextPair = { ...tokenResponse, user: me };
      persistTokenPair(nextPair);
      setTokenPair(nextPair);
      setUser(me);
      setStatus("signed_in");
      navigateTo(getPostLoginPath(me), { replace: true });
    } catch (error) {
      setErrorMessage(error.message || "Đăng nhập thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    persistTokenPair(null);
    setTokenPair(null);
    setUser(null);
    navigateTo("/", { replace: true });
    setStatus("signed_out");
  }

  function handleProfileUpdated(nextUser) {
    if (!nextUser) return;
    setUser(nextUser);
    setTokenPair((prev) => {
      if (!prev) return prev;
      const nextPair = { ...prev, user: nextUser };
      persistTokenPair(nextPair);
      return nextPair;
    });
  }

  function handleGoogleLogin() {
    setErrorMessage("");
    if (!DEFAULT_GOOGLE_AUTH_URL) {
      setErrorMessage("Chưa cấu hình URL Google login.");
      return;
    }
    window.location.assign(DEFAULT_GOOGLE_AUTH_URL);
  }

  const dashboardView = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  useEffect(() => {
    if (status === "booting") return;
    const redirectPath = resolveAuthRedirect({ pathname, status, user });
    if (redirectPath) navigateTo(redirectPath, { replace: true });
  }, [pathname, status, user]);

  const loadingView = useMemo(
    () => (
      <div className="grid min-h-screen place-items-center bg-gradient-to-br from-blue-50 via-white to-amber-50 p-6 text-slate-900">
        <div className="rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-slate-100">
          <div className="text-2xl font-black">Đang kiểm tra phiên đăng nhập...</div>
        </div>
      </div>
    ),
    []
  );

  const pendingRedirect = status === "booting" ? null : resolveAuthRedirect({ pathname, status, user });

  if (status === "booting" || pendingRedirect) return loadingView;

  if (status !== "signed_in" || !user || !tokenPair?.access_token) {
    if (pathname === "/") {
      return <Landing onLogin={() => navigateTo("/login")} />;
    }

    return (
      <AuthForm
        mode={mode}
        onModeChange={setMode}
        onSubmit={handleSubmit}
        onGoogleLogin={handleGoogleLogin}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
      />
    );
  }

  if (dashboardView && user.role !== "admin") {
    return null;
  }

  if (user.role === "admin" && dashboardView) {
    return (
      <AdminDashboard
        user={user}
        onOpenUserUi={() => navigateTo("/home")}
        onLogout={handleLogout}
        apiBaseUrl={API_BASE_URL}
        googleAuthUrl={DEFAULT_GOOGLE_AUTH_URL}
        accessToken={tokenPair.access_token}
        apiRequest={apiRequest}
        pathname={pathname}
        navigateTo={navigateTo}
      />
    );
  }

  return (
    <div className="relative">
      <SignlearnApp currentUser={user} accessToken={tokenPair.access_token} onLogout={handleLogout} onUserUpdate={handleProfileUpdated} />
      <HeaderActions user={user} onAdminView={() => navigateTo("/dashboard")} />
    </div>
  );
}


