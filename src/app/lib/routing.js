export function getCurrentPathname() {
  if (typeof window === "undefined") return "/";
  const path = window.location.pathname || "/";
  if (path === "/") return path;
  return path.replace(/\/+$/, "") || "/";
}

export function makeTopicPath(topicId) {
  return `/hoc-tap/${encodeURIComponent(topicId)}`;
}

export function makeHomePath() {
  return "/home";
}

export function makeBlogPath(slug = "") {
  const normalizedSlug = String(slug || "").trim();
  return normalizedSlug ? `/blog/${encodeURIComponent(normalizedSlug)}` : "/blog";
}

export function makeDashboardPath(section = "") {
  const normalizedSection = String(section || "").trim().replace(/^\/+|\/+$/g, "");
  return normalizedSection ? `/dashboard/${normalizedSection}` : "/dashboard";
}

export function makeLessonPath(topicId, moocIndex) {
  return `${makeTopicPath(topicId)}/mooc-${Number(moocIndex) + 1}`;
}

export function makeAiPath(topicId, moocIndex) {
  return `${makeLessonPath(topicId, moocIndex)}/ai`;
}

export function makeProfilePath() {
  return "/ho-so";
}

export function parseAppPath(pathname) {
  const normalizedPath = pathname && pathname !== "/" ? pathname.replace(/\/+$/, "") : "/";
  const segments = normalizedPath.split("/").filter(Boolean).map((segment) => decodeURIComponent(segment));

  if (segments.length === 0) return { page: "landing", pathname: "/" };
  if (segments[0] === "home") return { page: "home", pathname: normalizedPath };
  if (segments[0] === "blog" || segments[0] === "blogs") {
    return {
      page: "blogs",
      pathname: normalizedPath,
      blogSlug: segments[1] || "",
    };
  }
  if (segments[0] === "ho-so") return { page: "profile", pathname: normalizedPath };

  if (segments[0] === "hoc-tap") {
    if (segments.length === 1) return { page: "learning", pathname: normalizedPath };

    const topicId = segments[1];
    if (segments.length === 2) return { page: "topic", topicId, pathname: normalizedPath };

    const moocMatch = segments[2]?.match(/^mooc-(\d+)$/i);
    if (moocMatch) {
      const moocIndex = Math.max(0, Number(moocMatch[1]) - 1);
      if (segments.length === 3) return { page: "lesson", topicId, moocIndex, pathname: normalizedPath };
      if (segments.length === 4 && segments[3] === "ai") return { page: "ai", topicId, moocIndex, pathname: normalizedPath };
    }

    return { page: "learning", pathname: "/hoc-tap" };
  }

  return { page: "home", pathname: "/" };
}
