import { makeDashboardPath, makeHomePath } from "./routing.js";

const APP_ROUTE_PREFIXES = ["/home", "/blog", "/blogs", "/hoc-tap", "/ho-so", "/dashboard", "/admin"];

function normalizePathname(pathname) {
  const value = String(pathname || "/");
  if (value === "/") return "/";
  return value.replace(/\/+$/, "") || "/";
}

function isUnderProtectedPath(pathname) {
  return APP_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function getPostLoginPath(user) {
  return user?.role === "admin" ? makeDashboardPath() : makeHomePath();
}

export function resolveAuthRedirect({ pathname, status, user }) {
  const current = normalizePathname(pathname);

  if (status !== "signed_in" || !user) {
    if (current === "/") return null;
    if (isUnderProtectedPath(current)) return "/login";
    return null;
  }

  if (current === "/login" || current === "/") return getPostLoginPath(user);
  if (current === "/admin") return user.role === "admin" ? makeDashboardPath() : makeHomePath();
  if (current === "/dashboard" || current.startsWith("/dashboard/")) return user.role === "admin" ? null : makeHomePath();
  return null;
}
