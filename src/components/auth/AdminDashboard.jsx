import React, { useEffect, useMemo, useState } from "react";
import {
  QUIZ_QUESTION_TYPE_OPTIONS,
  buildQuizCreatePayload,
  buildQuizLinkPayload,
  buildQuizQuestionPayload,
  buildQuizUpdatePayload,
  createEmptyQuizDraft,
  createEmptyQuizOptionDraft,
  createEmptyQuizQuestionDraft,
  getQuestionAdminEndpoint,
  getQuestionCreateEndpoint,
  getQuizQuestionTypeConfig,
} from "../../app/lib/quizAdmin.js";
import { createAiConfigDraft, getAiConfigEndpoint, normalizeAiConfigPatchPayload } from "../../app/lib/aiConfig.js";
import { collectSignSlugOptions } from "../../app/lib/adminSignSlugs.js";
import { resolveQuizCreateAvailability, resolveVisibleLessonSelection } from "../../app/lib/adminDashboardContent.js";
import { makeDashboardPath } from "../../app/lib/routing.js";

const LEVEL_OPTIONS = ["beginner", "intermediate", "advanced"];
const ROLE_OPTIONS = ["student", "admin"];
const ADMIN_SIGN_SLUG_LIST_ID = "admin-sign-slug-options";
const SECTION_DEFS = [
  { id: "tong-quan", label: "Admin" },
  { id: "nguoi-dung", label: "Users" },
  { id: "khoa-hoc", label: "Courses" },
  { id: "bai-hoc", label: "Lessons" },
  { id: "noi-dung-mooc", label: "Signs & Quiz" },
  { id: "blog", label: "Blog" },
  { id: "ai", label: "AI" },
  { id: "practice", label: "Practice" },
];
const SECTION_IDS = new Set(SECTION_DEFS.map((item) => item.id));

function cx(...values) {
  return values.filter(Boolean).join(" ");
}

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function getDashboardSection(pathname) {
  const normalizedPath = pathname && pathname !== "/" ? pathname.replace(/\/+$/, "") : "/dashboard";
  const segments = normalizedPath.split("/").filter(Boolean);
  const sectionId = segments[1] || "tong-quan";
  return SECTION_IDS.has(sectionId) ? sectionId : "tong-quan";
}

function Card({ className = "", children }) {
  return <div className={cx("rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]", className)}>{children}</div>;
}

function Field({ label, className = "", children }) {
  return (
    <label className={cx("block", className)}>
      <div className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</div>
      {children}
    </label>
  );
}

function Input(props) {
  return <input {...props} className={cx("min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500", props.className)} />;
}

function Textarea(props) {
  return <textarea {...props} className={cx("w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500", props.className)} />;
}

function Select(props) {
  return <select {...props} className={cx("min-h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500", props.className)} />;
}

function ActionButton({ children, danger = false, subtle = false, className = "", ...props }) {
  return (
    <button
      {...props}
      className={cx(
        "min-h-11 rounded-2xl px-4 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500",
        danger
          ? "bg-rose-600 text-white hover:bg-rose-700"
          : subtle
            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "bg-slate-950 text-white hover:bg-slate-800",
        className
      )}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={cx("min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400", className)}
    >
      {children}
    </button>
  );
}

function SectionPanel({ title, description, action, children }) {
  return (
    <Card className="p-5 md:p-6">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Section</div>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{title}</h2>
          {description ? <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-600">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function StatCard({ label, value, helper }) {
  return (
    <Card className="p-5">
      <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-black text-slate-950">{value}</div>
      {helper ? <div className="mt-2 text-sm font-semibold text-slate-500">{helper}</div> : null}
    </Card>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <div className="text-lg font-black text-slate-800">{title}</div>
      {description ? <div className="mt-2 text-sm font-semibold text-slate-500">{description}</div> : null}
    </div>
  );
}

function JsonPreview({ value }) {
  if (value === undefined) return null;
  return <pre className="overflow-x-auto rounded-3xl bg-slate-950 p-4 text-xs font-semibold leading-6 text-slate-100">{JSON.stringify(value, null, 2)}</pre>;
}

function StatusBadge({ children, tone = "slate" }) {
  const toneClass = tone === "green"
    ? "bg-emerald-50 text-emerald-700"
    : tone === "amber"
      ? "bg-amber-50 text-amber-700"
      : tone === "rose"
        ? "bg-rose-50 text-rose-700"
        : "bg-slate-100 text-slate-700";
  return <span className={cx("inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em]", toneClass)}>{children}</span>;
}

function lessonDetailSignRows(detail) {
  return (detail?.items || []).filter((item) => item?.item_type === "sign");
}

export function AdminDashboard({
  user,
  onOpenUserUi,
  onLogout,
  accessToken,
  apiRequest,
  pathname,
  navigateTo,
  apiBaseUrl,
  googleClientId,
}) {
  const activeSection = useMemo(() => getDashboardSection(pathname), [pathname]);
  const [sectionState, setSectionState] = useState({});
  const [contentLessonId, setContentLessonId] = useState("");
  const [contentLessonQuery, setContentLessonQuery] = useState("");
  const [contentDetailsByLessonId, setContentDetailsByLessonId] = useState({});
  const [contentStatusByLessonId, setContentStatusByLessonId] = useState({});
  const [notice, setNotice] = useState({ error: "", success: "" });

  const [newUser, setNewUser] = useState({ email: "", password: "", full_name: "", role: "student", avatar_asset_id: "" });
  const [userDraftById, setUserDraftById] = useState({});

  const [newCourse, setNewCourse] = useState({ slug: "", title: "", description: "", level: "beginner", is_published: false });
  const [courseDraftById, setCourseDraftById] = useState({});

  const [newLesson, setNewLesson] = useState({ slug: "", title: "", description: "", level: "beginner", is_published: false });
  const [attachDraft, setAttachDraft] = useState({ courseId: "", lessonId: "", order_index: 1, is_required: true });
  const [lessonDraftById, setLessonDraftById] = useState({});

  const [lessonItemDraft, setLessonItemDraft] = useState({ lessonId: "", signSlugs: "" });
  const [newQuizDraft, setNewQuizDraft] = useState(createEmptyQuizDraft());
  const [quizDraftById, setQuizDraftById] = useState({});
  const [newQuestionDraftByQuizId, setNewQuestionDraftByQuizId] = useState({});
  const [questionDraftById, setQuestionDraftById] = useState({});
  const [vocabCatalogItems, setVocabCatalogItems] = useState([]);
  const [aiConfigSlug, setAiConfigSlug] = useState("");
  const [aiConfigDraft, setAiConfigDraft] = useState(createAiConfigDraft());
  const [aiConfigLoading, setAiConfigLoading] = useState(false);

  const [newCategory, setNewCategory] = useState({ name: "", slug: "", description: "" });
  const [newPost, setNewPost] = useState({ title: "", slug: "", summary: "", content: "", status: "draft", published_at: "" });

  async function loadSection(sectionId, { force = false } = {}) {
    const current = sectionState[sectionId];
    if (!force && (current?.status === "loading" || current?.status === "ready")) return;

    setSectionState((prev) => ({
      ...prev,
      [sectionId]: { ...(prev[sectionId] || {}), status: "loading", error: "" },
    }));

    try {
      let data;
      if (sectionId === "tong-quan") {
        const [overviewResp, authMeResp, profileResp, usersResp, coursesResp, lessonsResp] = await Promise.allSettled([
          apiRequest("/api/v1/admin/overview", { accessToken }),
          apiRequest("/api/v1/auth/me", { accessToken }),
          apiRequest("/api/v1/users/me", { accessToken }),
          apiRequest("/api/v1/users", { accessToken, query: { skip: 0, limit: 8 } }),
          apiRequest("/api/v1/courses", { accessToken, query: { skip: 0, limit: 200, include_unpublished: true } }),
          apiRequest("/api/v1/lessons", { accessToken, query: { skip: 0, limit: 200, include_unpublished: true } }),
        ]);
        data = {
          overview: overviewResp.status === "fulfilled" ? overviewResp.value : null,
          authMe: authMeResp.status === "fulfilled" ? authMeResp.value : null,
          profile: profileResp.status === "fulfilled" ? profileResp.value : null,
          recentUsers: usersResp.status === "fulfilled" ? normalizeList(usersResp.value) : [],
          courses: coursesResp.status === "fulfilled" ? normalizeList(coursesResp.value) : [],
          lessons: lessonsResp.status === "fulfilled" ? normalizeList(lessonsResp.value) : [],
        };
      }

      if (sectionId === "nguoi-dung") {
        const payload = await apiRequest("/api/v1/users", { accessToken, query: { skip: 0, limit: 200 } });
        data = { users: normalizeList(payload), meta: payload };
      }

      if (sectionId === "khoa-hoc") {
        const coursePayload = await apiRequest("/api/v1/courses", { accessToken, query: { skip: 0, limit: 200, include_unpublished: true } });
        const courses = normalizeList(coursePayload);
        const detailResults = await Promise.allSettled(courses.map((item) => apiRequest(`/api/v1/courses/${item.id}`, { accessToken })));
        const courseDetails = {};
        detailResults.forEach((result, index) => {
          if (result.status === "fulfilled") courseDetails[courses[index].id] = result.value;
        });
        data = { courses, courseDetails };
      }

      if (sectionId === "bai-hoc") {
        const [lessonPayload, coursePayload] = await Promise.all([
          apiRequest("/api/v1/lessons", { accessToken, query: { skip: 0, limit: 200, include_unpublished: true } }),
          apiRequest("/api/v1/courses", { accessToken, query: { skip: 0, limit: 200, include_unpublished: true } }),
        ]);
        const lessons = normalizeList(lessonPayload);
        const courses = normalizeList(coursePayload);
        const detailResults = await Promise.allSettled(lessons.map((item) => apiRequest(`/api/v1/lessons/${item.id}`, { accessToken })));
        const lessonDetails = {};
        detailResults.forEach((result, index) => {
          if (result.status === "fulfilled") lessonDetails[lessons[index].id] = result.value;
        });
        data = { lessons, lessonDetails, courses };
      }

      if (sectionId === "noi-dung-mooc") {
        const [lessonPayload, signPayload] = await Promise.all([
          apiRequest("/api/v1/lessons", { accessToken, query: { skip: 0, limit: 200, include_unpublished: true } }),
          apiRequest("/api/v1/signs", { accessToken }).catch(() => ({ items: [] })),
        ]);
        data = { lessons: normalizeList(lessonPayload), signs: normalizeList(signPayload) };
      }

      if (sectionId === "blog") {
        const [postsResp, categoriesResp] = await Promise.all([
          apiRequest("/api/v1/blog/posts", { accessToken, query: { skip: 0, limit: 100 } }),
          apiRequest("/api/v1/blog/categories", { accessToken, query: { skip: 0, limit: 100 } }),
        ]);
        data = { posts: normalizeList(postsResp), categories: normalizeList(categoriesResp) };
      }

      if (sectionId === "ai") {
        const [modelResp, labelsResp] = await Promise.allSettled([
          apiRequest("/api/v1/ai/model", { accessToken }),
          apiRequest("/api/v1/ai/labels", { accessToken }),
        ]);
        data = {
          model: modelResp.status === "fulfilled" ? modelResp.value : null,
          labels: labelsResp.status === "fulfilled" ? normalizeList(labelsResp.value) : [],
          modelError: modelResp.status === "rejected" ? modelResp.reason?.message || "Cannot load AI model." : "",
          labelsError: labelsResp.status === "rejected" ? labelsResp.reason?.message || "Cannot load labels." : "",
        };
      }

      if (sectionId === "practice") {
        const [attemptsResp, sessionsResp] = await Promise.allSettled([
          apiRequest("/api/v1/admin/practice-attempts", { accessToken, query: { skip: 0, limit: 100 } }),
          apiRequest("/api/v1/practice/sessions", { accessToken, query: { skip: 0, limit: 100 } }),
        ]);
        data = {
          attempts: attemptsResp.status === "fulfilled" ? normalizeList(attemptsResp.value) : [],
          sessions: sessionsResp.status === "fulfilled" ? normalizeList(sessionsResp.value) : [],
          attemptsRaw: attemptsResp.status === "fulfilled" ? attemptsResp.value : null,
          sessionsRaw: sessionsResp.status === "fulfilled" ? sessionsResp.value : null,
          attemptsError: attemptsResp.status === "rejected" ? attemptsResp.reason?.message || "Cannot load attempts." : "",
          sessionsError: sessionsResp.status === "rejected" ? sessionsResp.reason?.message || "Cannot load sessions." : "",
        };
      }

      setSectionState((prev) => ({
        ...prev,
        [sectionId]: { status: "ready", error: "", data, loadedAt: Date.now() },
      }));
    } catch (error) {
      setSectionState((prev) => ({
        ...prev,
        [sectionId]: { ...(prev[sectionId] || {}), status: "error", error: error?.message || "Cannot load this section." },
      }));
    }
  }

  async function loadContentLessonDetail(lessonId, { force = false } = {}) {
    if (!lessonId) return;
    const current = contentStatusByLessonId[lessonId];
    if (!force && (current === "loading" || current === "ready")) return;

    setContentStatusByLessonId((prev) => ({ ...prev, [lessonId]: "loading" }));

    try {
      const detail = await apiRequest(`/api/v1/lessons/${lessonId}`, { accessToken });
      const quizSummary = await apiRequest(`/api/v1/lessons/${lessonId}/quiz`, { accessToken }).catch(() => ({ items: [] }));
      const quizzes = normalizeList(quizSummary);
      const quizDetailsResults = await Promise.allSettled(quizzes.map((item) => apiRequest(`/api/v1/quizzes/${item.id}`, { accessToken })));
      const quizDetails = quizDetailsResults
        .map((result) => (result.status === "fulfilled" ? result.value : null))
        .filter(Boolean);

      setContentDetailsByLessonId((prev) => ({
        ...prev,
        [lessonId]: { detail, quizzes: quizDetails, quizSummary: quizzes },
      }));
      setContentStatusByLessonId((prev) => ({ ...prev, [lessonId]: "ready" }));
    } catch (error) {
      setContentStatusByLessonId((prev) => ({ ...prev, [lessonId]: error?.message || "Cannot load lesson content." }));
    }
  }

  function invalidateSections(sectionIds) {
    setSectionState((prev) => {
      const next = { ...prev };
      sectionIds.forEach((id) => {
        delete next[id];
      });
      return next;
    });
  }

  async function runAction(work, { success = "Saved.", reload = [], invalidate = [], reloadContentLesson = false } = {}) {
    setNotice({ error: "", success: "" });
    try {
      await work();
      if (invalidate.length) invalidateSections(invalidate);
      if (reload.length) {
        for (const sectionId of reload) {
          await loadSection(sectionId, { force: true });
        }
      }
      if (reloadContentLesson && contentLessonId) {
        await loadContentLessonDetail(contentLessonId, { force: true });
      }
      setNotice({ error: "", success });
    } catch (error) {
      setNotice({ error: error?.message || "Action failed.", success: "" });
    }
  }

  useEffect(() => {
    if (!accessToken) return;
    loadSection(activeSection);
  }, [activeSection, accessToken]);

  const contentData = sectionState["noi-dung-mooc"]?.data || { lessons: [], signs: [] };

  useEffect(() => {
    if (activeSection !== "noi-dung-mooc") return;
    if (!contentLessonId) return;
    setNewQuizDraft((prev) => ({ ...prev, lesson_id: String(prev.lesson_id || contentLessonId) }));
  }, [activeSection, contentLessonId]);

  useEffect(() => {
    if (activeSection !== "noi-dung-mooc" || !contentLessonId) return;
    loadContentLessonDetail(Number(contentLessonId));
  }, [activeSection, contentLessonId]);

  useEffect(() => {
    if (!["noi-dung-mooc", "ai"].includes(activeSection) || vocabCatalogItems.length) return;

    let cancelled = false;
    import("../../../tu_vung.json")
      .then((module) => {
        if (!cancelled) setVocabCatalogItems(Array.isArray(module?.default?.items) ? module.default.items : []);
      })
      .catch(() => {
        if (!cancelled) setVocabCatalogItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [activeSection, vocabCatalogItems.length]);

  const activeSectionState = sectionState[activeSection] || { status: "idle", error: "", data: null };
  const usersData = sectionState["nguoi-dung"]?.data || { users: [] };
  const coursesData = sectionState["khoa-hoc"]?.data || { courses: [], courseDetails: {} };
  const lessonsData = sectionState["bai-hoc"]?.data || { lessons: [], lessonDetails: {}, courses: [] };
  const blogData = sectionState.blog?.data || { posts: [], categories: [] };
  const aiData = sectionState.ai?.data || { model: null, labels: [], modelError: "", labelsError: "" };
  const practiceData = sectionState.practice?.data || { attempts: [], sessions: [], attemptsError: "", sessionsError: "" };

  async function loadAiConfigBySlug() {
    setAiConfigLoading(true);
    try {
      const payload = await apiRequest(getAiConfigEndpoint(aiConfigSlug), { accessToken });
      setAiConfigSlug(payload?.signSlug || String(aiConfigSlug || "").trim());
      setAiConfigDraft(createAiConfigDraft(payload));
    } finally {
      setAiConfigLoading(false);
    }
  }

  async function saveAiConfigBySlug() {
    setAiConfigLoading(true);
    try {
      const payload = normalizeAiConfigPatchPayload(aiConfigDraft);
      const saved = await apiRequest(getAiConfigEndpoint(aiConfigSlug), {
        method: "PATCH",
        accessToken,
        body: payload,
      });
      setAiConfigSlug(saved?.signSlug || String(aiConfigSlug || "").trim());
      setAiConfigDraft(createAiConfigDraft(saved));
    } finally {
      setAiConfigLoading(false);
    }
  }

  const lessonSelectOptions = useMemo(
    () => (lessonsData.lessons.length ? lessonsData.lessons : contentData.lessons).map((item) => ({ id: item.id, label: `${item.id} - ${item.title}` })),
    [contentData.lessons, lessonsData.lessons]
  );
  const filteredContentLessons = useMemo(() => {
    const query = String(contentLessonQuery || "").trim().toLowerCase();
    if (!query) return contentData.lessons;
    return contentData.lessons.filter((item) => {
      const haystack = `${item.id || ""} ${item.title || ""} ${item.slug || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [contentData.lessons, contentLessonQuery]);

  useEffect(() => {
    if (activeSection !== "noi-dung-mooc") return;

    const nextLessonId = resolveVisibleLessonSelection({
      lessons: contentData.lessons,
      filteredLessons: filteredContentLessons,
      currentLessonId: contentLessonId,
      hasSearchQuery: Boolean(String(contentLessonQuery || "").trim()),
    });

    if (nextLessonId === String(contentLessonId || "")) return;

    setContentLessonId(nextLessonId);
    setLessonItemDraft((prev) => ({ ...prev, lessonId: nextLessonId }));
    setNewQuizDraft((prev) => ({ ...prev, lesson_id: nextLessonId || String(prev.lesson_id || "") }));
  }, [activeSection, contentData.lessons, filteredContentLessons, contentLessonId, contentLessonQuery]);
  const courseSelectOptions = useMemo(
    () => (lessonsData.courses.length ? lessonsData.courses : coursesData.courses).map((item) => ({ id: item.id, label: `${item.id} - ${item.title}` })),
    [coursesData.courses, lessonsData.courses]
  );
  const signSlugOptions = useMemo(
    () => collectSignSlugOptions(contentData.signs, vocabCatalogItems),
    [contentData.signs, vocabCatalogItems]
  );

  async function createUser() {
    if (!newUser.email.trim() || !newUser.password.trim()) throw new Error("User needs email and password.");
    await apiRequest("/api/v1/users", {
      method: "POST",
      accessToken,
      body: {
        email: newUser.email.trim(),
        password: newUser.password.trim(),
        full_name: newUser.full_name.trim() || null,
        role: newUser.role,
        avatar_asset_id: newUser.avatar_asset_id ? Number(newUser.avatar_asset_id) : null,
      },
    });
    setNewUser({ email: "", password: "", full_name: "", role: "student", avatar_asset_id: "" });
  }

  async function updateUser(item) {
    const draft = userDraftById[item.id] || {};
    await apiRequest(`/api/v1/users/${item.id}`, {
      method: "PATCH",
      accessToken,
      body: {
        full_name: draft.full_name === undefined ? item.full_name : draft.full_name || null,
        role: draft.role ?? item.role,
        avatar_asset_id: draft.avatar_asset_id === undefined
          ? item.avatar_asset_id
          : draft.avatar_asset_id === ""
            ? null
            : Number(draft.avatar_asset_id),
        ...(draft.password ? { password: draft.password } : {}),
      },
    });
  }

  async function deleteUser(item) {
    if (!window.confirm(`Delete user ${item.email || item.id}?`)) return;
    await apiRequest(`/api/v1/users/${item.id}`, { method: "DELETE", accessToken });
  }

  async function createCourse() {
    if (!newCourse.slug.trim() || !newCourse.title.trim()) throw new Error("Course needs slug and title.");
    await apiRequest("/api/v1/courses", {
      method: "POST",
      accessToken,
      body: {
        slug: newCourse.slug.trim(),
        title: newCourse.title.trim(),
        description: newCourse.description.trim() || null,
        level: newCourse.level,
        is_published: !!newCourse.is_published,
      },
    });
    setNewCourse({ slug: "", title: "", description: "", level: "beginner", is_published: false });
  }

  async function updateCourse(item) {
    const draft = courseDraftById[item.id] || {};
    await apiRequest(`/api/v1/courses/${item.id}`, {
      method: "PATCH",
      accessToken,
      body: {
        slug: String(draft.slug ?? item.slug ?? "").trim(),
        title: String(draft.title ?? item.title ?? "").trim(),
        description: String(draft.description ?? item.description ?? "").trim() || null,
        level: draft.level ?? item.level,
        is_published: draft.is_published ?? item.is_published,
      },
    });
  }

  async function deleteCourse(item) {
    if (!window.confirm(`Delete course ${item.title || item.id}?`)) return;
    await apiRequest(`/api/v1/courses/${item.id}`, { method: "DELETE", accessToken });
  }

  async function createLesson() {
    if (!newLesson.title.trim()) throw new Error("Lesson needs title.");
    const lessonSlug = newLesson.slug.trim();
    await apiRequest("/api/v1/lessons", {
      method: "POST",
      accessToken,
      body: {
        ...(lessonSlug ? { slug: lessonSlug } : {}),
        title: newLesson.title.trim(),
        description: newLesson.description.trim() || null,
        level: newLesson.level,
        is_published: !!newLesson.is_published,
      },
    });
    setNewLesson({ slug: "", title: "", description: "", level: "beginner", is_published: false });
  }

  async function updateLesson(item) {
    const draft = lessonDraftById[item.id] || {};
    const nextSlug = String(draft.slug ?? item.slug ?? "").trim();
    await apiRequest(`/api/v1/lessons/${item.id}`, {
      method: "PATCH",
      accessToken,
      body: {
        ...(nextSlug ? { slug: nextSlug } : {}),
        title: String(draft.title ?? item.title ?? "").trim(),
        description: String(draft.description ?? item.description ?? "").trim() || null,
        level: draft.level ?? item.level,
        is_published: draft.is_published ?? item.is_published,
      },
    });
  }

  async function deleteLesson(item) {
    if (!window.confirm(`Delete lesson ${item.title || item.id}?`)) return;
    await apiRequest(`/api/v1/lessons/${item.id}`, { method: "DELETE", accessToken });
  }

  async function attachLessonToCourse() {
    const courseId = Number(attachDraft.courseId);
    const lessonId = Number(attachDraft.lessonId);
    if (!courseId || !lessonId) throw new Error("Pick course and lesson first.");
    await apiRequest(`/api/v1/courses/${courseId}/lessons`, {
      method: "POST",
      accessToken,
      body: {
        lesson_id: lessonId,
        order_index: Number(attachDraft.order_index) || 1,
        is_required: !!attachDraft.is_required,
      },
    });
  }

  async function addSignsToLesson() {
    const lessonId = Number(lessonItemDraft.lessonId || contentLessonId);
    const signSlugs = String(lessonItemDraft.signSlugs || "").split(",").map((item) => item.trim()).filter(Boolean);
    if (!lessonId || signSlugs.length === 0) throw new Error("Pick lesson and enter at least one sign slug.");
    for (const slug of signSlugs) {
      await apiRequest(`/api/v1/lessons/${lessonId}/items`, {
        method: "POST",
        accessToken,
        body: { item_type: "sign", sign_slugs: [slug] },
      });
    }
    setLessonItemDraft({ lessonId: String(lessonId), signSlugs: "" });
  }

  async function deleteLessonSign(lessonId, signId, label) {
    if (!signId) throw new Error(`Missing sign id for ${label || "sign"}.`);
    if (!window.confirm(`Delete sign ${label || signId} from lesson #${lessonId}?`)) return;
    await apiRequest(`/api/v1/lessons/${lessonId}/signs/${signId}`, { method: "DELETE", accessToken });
  }

  async function createQuiz() {
    const quizCreateAvailability = resolveQuizCreateAvailability({
      contentLessonId,
      draftLessonId: newQuizDraft.lesson_id,
      contentDetailsByLessonId,
    });
    if (quizCreateAvailability.isLocked) {
      throw new Error(`Lesson ${quizCreateAvailability.lessonId} already has a quiz.`);
    }

    const payload = buildQuizCreatePayload(newQuizDraft, contentLessonId);
    const createdQuiz = await apiRequest("/api/v1/admin/quizzes", {
      method: "POST",
      accessToken,
      body: payload,
    });

    if (payload.lesson_id && createdQuiz?.id) {
      await apiRequest(`/api/v1/lessons/${payload.lesson_id}/items`, {
        method: "POST",
        accessToken,
        body: {
          item_type: "quiz",
          quiz_id: createdQuiz.id,
        },
      });
    }

    setNewQuizDraft(createEmptyQuizDraft({ lesson_id: String(payload.lesson_id || contentLessonId || "") }));
  }

  async function updateQuiz(quiz) {
    const draft = quizDraftById[quiz.id] || {};
    await apiRequest(`/api/v1/admin/quizzes/${quiz.id}`, {
      method: "PUT",
      accessToken,
      body: buildQuizUpdatePayload(draft, quiz),
    });
  }

  async function deleteQuiz(quiz) {
    if (!window.confirm(`Delete quiz ${quiz.title || quiz.id}?`)) return;
    await apiRequest(`/api/v1/admin/quizzes/${quiz.id}`, { method: "DELETE", accessToken });
  }

  async function createQuizQuestion(quizId) {
    const draft = newQuestionDraftByQuizId[quizId] || createEmptyQuizQuestionDraft();
    const questionPayload = buildQuizQuestionPayload(draft);
    const createdQuestion = await apiRequest(getQuestionCreateEndpoint(draft.question_type), {
      method: "POST",
      accessToken,
      body: questionPayload,
    });

    await apiRequest(`/api/v1/admin/quizzes/${quizId}/question-links`, {
      method: "POST",
      accessToken,
      body: buildQuizLinkPayload(draft, createdQuestion),
    });

    setNewQuestionDraftByQuizId((prev) => ({ ...prev, [quizId]: createEmptyQuizQuestionDraft() }));
  }

  async function updateQuizQuestion(question) {
    const draft = questionDraftById[question.id] || {};
    await apiRequest(getQuestionAdminEndpoint(question.question_type, question.question_id ?? question.id), {
      method: "PUT",
      accessToken,
      body: buildQuizQuestionPayload(draft, question),
    });
  }

  async function deleteQuizQuestion(question) {
    if (!window.confirm(`Delete question #${question.question_id ?? question.id}?`)) return;
    await apiRequest(getQuestionAdminEndpoint(question.question_type, question.question_id ?? question.id), {
      method: "DELETE",
      accessToken,
    });
  }

  async function createCategory() {
    if (!newCategory.name.trim() || !newCategory.slug.trim()) throw new Error("Category needs name and slug.");
    await apiRequest("/api/v1/blog/categories", {
      method: "POST",
      accessToken,
      body: {
        name: newCategory.name.trim(),
        slug: newCategory.slug.trim(),
        description: newCategory.description.trim() || null,
      },
    });
    setNewCategory({ name: "", slug: "", description: "" });
  }

  async function createPost() {
    if (!newPost.title.trim() || !newPost.slug.trim()) throw new Error("Post needs title and slug.");
    await apiRequest("/api/v1/blog/posts", {
      method: "POST",
      accessToken,
      body: {
        title: newPost.title.trim(),
        slug: newPost.slug.trim(),
        summary: newPost.summary.trim() || null,
        content: newPost.content.trim() || null,
        status: newPost.status.trim() || "draft",
        published_at: newPost.published_at || null,
      },
    });
    setNewPost({ title: "", slug: "", summary: "", content: "", status: "draft", published_at: "" });
  }

  async function deletePost(item) {
    if (!window.confirm(`Delete blog post ${item.title || item.id}?`)) return;
    await apiRequest(`/api/v1/blog/admin/posts/${item.id}`, { method: "DELETE", accessToken });
  }

  async function deleteCategory(item) {
    if (!window.confirm(`Delete category ${item.name || item.id}?`)) return;
    await apiRequest(`/api/v1/blog/categories/${item.id}`, { method: "DELETE", accessToken });
  }

  const currentContentDetail = contentDetailsByLessonId[contentLessonId] || null;
  const currentContentStatus = contentStatusByLessonId[contentLessonId] || "idle";

  function renderOverviewSection() {
    const data = sectionState["tong-quan"]?.data;
    if (!data) return null;
    const counts = data.overview?.counts || data.overview?.summary || {};
    const publishedCourses = data.courses.filter((item) => item.is_published).length;
    const publishedLessons = data.lessons.filter((item) => item.is_published).length;

    return (
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Users" value={counts.users ?? data.recentUsers.length} helper="Recent sample + admin overview" />
          <StatCard label="Courses" value={counts.courses ?? data.courses.length} helper={`${publishedCourses} published`} />
          <StatCard label="Lessons" value={counts.lessons ?? data.lessons.length} helper={`${publishedLessons} published`} />
          <StatCard label="Backend" value={apiBaseUrl || "relative"} helper="API base URL" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.25fr_0.95fr]">
          <Card className="p-5 md:p-6">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Admin profile</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-4">
                <div className="text-sm font-black text-slate-900">Signed in</div>
                <div className="mt-3 space-y-2 text-sm font-semibold text-slate-700">
                  <div>Name: {data.profile?.full_name || data.authMe?.full_name || user?.full_name || "-"}</div>
                  <div>Email: {data.profile?.email || data.authMe?.email || user?.email || "-"}</div>
                  <div>Role: {data.profile?.role || data.authMe?.role || user?.role || "-"}</div>
                  <div>Updated: {formatDate(data.profile?.updated_at || data.authMe?.updated_at)}</div>
                </div>
              </div>
              <div className="rounded-3xl bg-emerald-50 p-4">
                <div className="text-sm font-black text-slate-900">System links</div>
                <div className="mt-3 space-y-2 text-sm font-semibold text-slate-700">
                  <div>Dashboard route: {pathname || "/dashboard"}</div>
                  <div>Google client ID: {googleClientId || "-"}</div>
                  <div>Lazy section: {activeSection}</div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 md:p-6">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Recent users</div>
            <div className="mt-4 space-y-3">
              {data.recentUsers.length ? data.recentUsers.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-slate-900">{item.full_name || item.email}</div>
                      <div className="text-xs font-semibold text-slate-500">{item.email}</div>
                    </div>
                    <StatusBadge tone={item.role === "admin" ? "amber" : "green"}>{item.role}</StatusBadge>
                  </div>
                </div>
              )) : <EmptyState title="No user sample" description="Backend did not return user rows." />}
            </div>
          </Card>
        </div>

        <Card className="p-5 md:p-6">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Admin overview payload</div>
          <div className="mt-4">
            <JsonPreview value={data.overview} />
          </div>
        </Card>
      </div>
    );
  }

  function renderUsersSection() {
    const users = usersData.users;
    return (
      <div className="space-y-5">
        <div className="grid gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-4 md:grid-cols-6">
          <Field label="Email" className="md:col-span-2"><Input value={newUser.email} onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))} /></Field>
          <Field label="Password"><Input type="password" value={newUser.password} onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))} /></Field>
          <Field label="Full name"><Input value={newUser.full_name} onChange={(e) => setNewUser((prev) => ({ ...prev, full_name: e.target.value }))} /></Field>
          <Field label="Role"><Select value={newUser.role} onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value }))}>{ROLE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</Select></Field>
          <Field label="Avatar asset id"><Input value={newUser.avatar_asset_id} onChange={(e) => setNewUser((prev) => ({ ...prev, avatar_asset_id: e.target.value }))} /></Field>
          <div className="md:col-span-6 flex justify-end"><ActionButton onClick={() => runAction(createUser, { success: "Created user.", reload: ["nguoi-dung", "tong-quan"] })}>Create user</ActionButton></div>
        </div>

        <div className="space-y-3">
          {users.length ? users.map((item) => {
            const draft = userDraftById[item.id] || {};
            return (
              <Card key={item.id} className="p-4">
                <div className="grid gap-3 md:grid-cols-6">
                  <Field label="Email" className="md:col-span-2"><Input value={item.email || ""} disabled /></Field>
                  <Field label="Full name"><Input value={draft.full_name ?? item.full_name ?? ""} onChange={(e) => setUserDraftById((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), full_name: e.target.value } }))} /></Field>
                  <Field label="Role"><Select value={draft.role ?? item.role} onChange={(e) => setUserDraftById((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), role: e.target.value } }))}>{ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}</Select></Field>
                  <Field label="Avatar asset id"><Input value={draft.avatar_asset_id ?? item.avatar_asset_id ?? ""} onChange={(e) => setUserDraftById((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), avatar_asset_id: e.target.value } }))} /></Field>
                  <Field label="Reset password"><Input type="password" value={draft.password ?? ""} onChange={(e) => setUserDraftById((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), password: e.target.value } }))} /></Field>
                  <div className="md:col-span-6 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-slate-500">Created {formatDate(item.created_at)} · Updated {formatDate(item.updated_at)}</div>
                    <div className="flex flex-wrap gap-2">
                      <ActionButton onClick={() => runAction(() => updateUser(item), { success: `Updated user #${item.id}.`, reload: ["nguoi-dung", "tong-quan"] })}>Save</ActionButton>
                      <ActionButton danger onClick={() => runAction(() => deleteUser(item), { success: `Deleted user #${item.id}.`, reload: ["nguoi-dung", "tong-quan"] })}>Delete</ActionButton>
                    </div>
                  </div>
                </div>
              </Card>
            );
          }) : <EmptyState title="No users" description="Open this section after backend returns /users data." />}
        </div>
      </div>
    );
  }

  function renderCoursesSection() {
    const { courses, courseDetails } = coursesData;
    return (
      <div className="space-y-5">
        <div className="grid gap-3 rounded-[28px] border border-slate-200 bg-slate-50 p-4 md:grid-cols-5">
          <Field label="Slug"><Input value={newCourse.slug} onChange={(e) => setNewCourse((prev) => ({ ...prev, slug: e.target.value }))} /></Field>
          <Field label="Title"><Input value={newCourse.title} onChange={(e) => setNewCourse((prev) => ({ ...prev, title: e.target.value }))} /></Field>
          <Field label="Level"><Select value={newCourse.level} onChange={(e) => setNewCourse((prev) => ({ ...prev, level: e.target.value }))}>{LEVEL_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</Select></Field>
          <Field label="Published"><Select value={String(newCourse.is_published)} onChange={(e) => setNewCourse((prev) => ({ ...prev, is_published: e.target.value === "true" }))}><option value="false">false</option><option value="true">true</option></Select></Field>
          <div className="flex items-end"><ActionButton onClick={() => runAction(createCourse, { success: "Created course.", reload: ["khoa-hoc", "bai-hoc", "tong-quan"] })}>Create course</ActionButton></div>
          <Field label="Description" className="md:col-span-5"><Textarea rows={2} value={newCourse.description} onChange={(e) => setNewCourse((prev) => ({ ...prev, description: e.target.value }))} /></Field>
        </div>

        <div className="space-y-3">
          {courses.length ? courses.map((item) => {
            const draft = courseDraftById[item.id] || {};
            const detailLessons = courseDetails[item.id]?.lessons || [];
            return (
              <Card key={item.id} className="p-4">
                <div className="grid gap-3 md:grid-cols-5">
                  <Field label="Slug"><Input value={draft.slug ?? item.slug ?? ""} onChange={(e) => setCourseDraftById((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), slug: e.target.value } }))} /></Field>
                  <Field label="Title"><Input value={draft.title ?? item.title ?? ""} onChange={(e) => setCourseDraftById((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), title: e.target.value } }))} /></Field>
                  <Field label="Level"><Select value={draft.level ?? item.level} onChange={(e) => setCourseDraftById((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), level: e.target.value } }))}>{LEVEL_OPTIONS.map((lv) => <option key={lv} value={lv}>{lv}</option>)}</Select></Field>
                  <Field label="Published"><Select value={String(draft.is_published ?? item.is_published)} onChange={(e) => setCourseDraftById((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), is_published: e.target.value === "true" } }))}><option value="false">false</option><option value="true">true</option></Select></Field>
                  <div className="flex items-end gap-2"><ActionButton onClick={() => runAction(() => updateCourse(item), { success: `Updated course #${item.id}.`, reload: ["khoa-hoc", "bai-hoc", "tong-quan"] })}>Save</ActionButton><ActionButton danger onClick={() => runAction(() => deleteCourse(item), { success: `Deleted course #${item.id}.`, reload: ["khoa-hoc", "tong-quan", "bai-hoc"], invalidate: ["noi-dung-mooc"] })}>Delete</ActionButton></div>
                  <Field label="Description" className="md:col-span-5"><Textarea rows={2} value={draft.description ?? item.description ?? ""} onChange={(e) => setCourseDraftById((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), description: e.target.value } }))} /></Field>
                </div>
                <div className="mt-3 text-xs font-semibold text-slate-500">Lessons: {detailLessons.map((row) => `#${row.lesson_id}:${row.title}`).join(" | ") || "(empty)"}</div>
              </Card>
            );
          }) : <EmptyState title="No courses" description="Backend does not have course rows yet." />}
        </div>
      </div>
    );
  }

  function renderLessonsSection() {
    const { lessons, lessonDetails } = lessonsData;
    return (
      <div className="space-y-5">
        <div className="grid gap-3 rounded-[28px] border border-slate-200 bg-slate-50 p-4 md:grid-cols-6">
          <Field label="Slug"><Input value={newLesson.slug} onChange={(e) => setNewLesson((prev) => ({ ...prev, slug: e.target.value }))} /></Field>
          <Field label="Title"><Input value={newLesson.title} onChange={(e) => setNewLesson((prev) => ({ ...prev, title: e.target.value }))} /></Field>
          <Field label="Level"><Select value={newLesson.level} onChange={(e) => setNewLesson((prev) => ({ ...prev, level: e.target.value }))}>{LEVEL_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</Select></Field>
          <Field label="Published"><Select value={String(newLesson.is_published)} onChange={(e) => setNewLesson((prev) => ({ ...prev, is_published: e.target.value === "true" }))}><option value="false">false</option><option value="true">true</option></Select></Field>
          <div className="md:col-span-2 flex items-end"><ActionButton onClick={() => runAction(createLesson, { success: "Created lesson.", reload: ["bai-hoc", "tong-quan"], invalidate: ["noi-dung-mooc"] })}>Create lesson</ActionButton></div>
          <Field label="Description" className="md:col-span-6"><Textarea rows={2} value={newLesson.description} onChange={(e) => setNewLesson((prev) => ({ ...prev, description: e.target.value }))} /></Field>
        </div>

        <div className="grid gap-3 rounded-[28px] border border-slate-200 bg-slate-50 p-4 md:grid-cols-5">
          <Field label="Course"><Select value={attachDraft.courseId} onChange={(e) => setAttachDraft((prev) => ({ ...prev, courseId: e.target.value }))}><option value="">-- select --</option>{courseSelectOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></Field>
          <Field label="Lesson"><Select value={attachDraft.lessonId} onChange={(e) => setAttachDraft((prev) => ({ ...prev, lessonId: e.target.value }))}><option value="">-- select --</option>{lessonSelectOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></Field>
          <Field label="Order"><Input type="number" min={1} value={attachDraft.order_index} onChange={(e) => setAttachDraft((prev) => ({ ...prev, order_index: Number(e.target.value || 1) }))} /></Field>
          <Field label="Required"><Select value={String(attachDraft.is_required)} onChange={(e) => setAttachDraft((prev) => ({ ...prev, is_required: e.target.value === "true" }))}><option value="true">true</option><option value="false">false</option></Select></Field>
          <div className="flex items-end"><ActionButton onClick={() => runAction(attachLessonToCourse, { success: "Attached lesson to course.", reload: ["khoa-hoc", "bai-hoc"], invalidate: ["noi-dung-mooc", "tong-quan"] })}>Attach</ActionButton></div>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-2">
          {lessons.length ? lessons.map((item) => {
            const draft = lessonDraftById[item.id] || {};
            const signRows = lessonDetailSignRows(lessonDetails[item.id]);
            return (
              <Card key={item.id} className="p-4">
                <div className="grid gap-3 md:grid-cols-6">
                  <Field label="Slug"><Input value={draft.slug ?? item.slug ?? ""} onChange={(e) => setLessonDraftById((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), slug: e.target.value } }))} /></Field>
                  <Field label="Title"><Input value={draft.title ?? item.title ?? ""} onChange={(e) => setLessonDraftById((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), title: e.target.value } }))} /></Field>
                  <Field label="Level"><Select value={draft.level ?? item.level} onChange={(e) => setLessonDraftById((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), level: e.target.value } }))}>{LEVEL_OPTIONS.map((lv) => <option key={lv} value={lv}>{lv}</option>)}</Select></Field>
                  <Field label="Published"><Select value={String(draft.is_published ?? item.is_published)} onChange={(e) => setLessonDraftById((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), is_published: e.target.value === "true" } }))}><option value="false">false</option><option value="true">true</option></Select></Field>
                  <div className="md:col-span-2 flex items-end gap-2"><ActionButton onClick={() => runAction(() => updateLesson(item), { success: `Updated lesson #${item.id}.`, reload: ["bai-hoc"], invalidate: ["noi-dung-mooc", "tong-quan"] })}>Save</ActionButton><ActionButton danger onClick={() => runAction(() => deleteLesson(item), { success: `Deleted lesson #${item.id}.`, reload: ["bai-hoc", "khoa-hoc", "tong-quan"], invalidate: ["noi-dung-mooc"] })}>Delete</ActionButton></div>
                  <Field label="Description" className="md:col-span-6"><Textarea rows={2} value={draft.description ?? item.description ?? ""} onChange={(e) => setLessonDraftById((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), description: e.target.value } }))} /></Field>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl bg-amber-50 p-4">
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">Signs</div>
                    <div className="mt-3 text-sm font-semibold text-slate-700">{signRows.length ? signRows.map((row) => row.sign?.slug || row.sign_id || row.id).join(", ") : "(empty)"}</div>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                    <div>ID: {item.id}</div>
                    <div>Slug: {item.slug || "(none)"}</div>
                    <div>Updated: {formatDate(item.updated_at)}</div>
                  </div>
                </div>
              </Card>
            );
          }) : <EmptyState title="No lessons" description="Create lesson rows to populate MOOC data." />}
        </div>
      </div>
    );
  }

  function renderContentSection() {
    const signs = contentData.signs;
    const lessons = contentData.lessons;
    const detail = currentContentDetail?.detail;
    const quizzes = currentContentDetail?.quizzes || [];
    const signRows = lessonDetailSignRows(detail);
    const quizCreateAvailability = resolveQuizCreateAvailability({
      contentLessonId,
      draftLessonId: newQuizDraft.lesson_id,
      contentDetailsByLessonId,
    });
    const lessonSignOptions = signRows.map((row) => ({
      id: row.sign_id,
      label: `${row.sign_id} - ${row.sign?.title_vi || row.sign?.label || row.sign?.slug || `sign-${row.sign_id}`}`,
    }));
    const currentStatusText = currentContentStatus === "loading" ? "Loading lesson detail..." : typeof currentContentStatus === "string" && currentContentStatus !== "ready" && currentContentStatus !== "idle" ? currentContentStatus : "";

    return (
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.3fr]">
        <datalist id={ADMIN_SIGN_SLUG_LIST_ID}>{signSlugOptions.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}</datalist>
        <Card className="p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Lessons</div>
              <div className="mt-1 text-lg font-black text-slate-950">Lesson picker</div>
            </div>
            <StatusBadge>{lessons.length}</StatusBadge>
          </div>
          <div className="mt-4 space-y-3">
            <Field label="Search lesson">
              <Input value={contentLessonQuery} onChange={(e) => setContentLessonQuery(e.target.value)} placeholder="Search by id, title, slug..." />
            </Field>
            {lessons.length ? (
              <>
                <Field label="Lesson list">
                  <Select
                    size={Math.min(Math.max(filteredContentLessons.length || 4, 4), 12)}
                    value={contentLessonId}
                    onChange={(e) => {
                      setContentLessonId(e.target.value);
                      setLessonItemDraft((prev) => ({ ...prev, lessonId: e.target.value }));
                      setNewQuizDraft((prev) => ({ ...prev, lesson_id: e.target.value }));
                    }}
                    className="min-h-[320px]"
                  >
                    {filteredContentLessons.map((item) => <option key={item.id} value={item.id}>{item.id} - {item.title} {item.slug ? `(${item.slug})` : ""}</option>)}
                  </Select>
                </Field>
                <div className="rounded-3xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                  <div>Showing {filteredContentLessons.length} / {lessons.length} lessons</div>
                  <div className="mt-2">Selected: {detail?.title || "No lesson selected"}</div>
                  {detail ? <div className="mt-1 text-xs text-slate-500">Lesson #{detail.id} · {detail.slug || "no slug"}</div> : null}
                </div>
              </>
            ) : <EmptyState title="No lessons" description="Lesson data is required for signs and quiz admin." />}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Lesson content</div>
                <div className="mt-2 text-2xl font-black text-slate-950">{detail?.title || "Select a lesson"}</div>
                {detail ? <div className="mt-2 text-sm font-semibold text-slate-500">Lesson #{detail.id} · {detail.slug || "no slug"}</div> : null}
              </div>
              <GhostButton disabled={!contentLessonId} onClick={() => contentLessonId && loadContentLessonDetail(Number(contentLessonId), { force: true })}>Reload detail</GhostButton>
            </div>

            {currentStatusText ? <div className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">{currentStatusText}</div> : null}

            <div className="mt-5 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl bg-slate-50 p-4">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">Signs in lesson</div>
                <div className="mt-3 space-y-2 text-sm font-semibold text-slate-700">
                  {signRows.length ? signRows.map((row) => (
                    <div key={row.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2">
                      <span>{row.sign?.slug || row.sign_id || row.id}</span>
                      <button type="button" className="text-rose-600 hover:text-rose-700" onClick={() => runAction(() => deleteLessonSign(detail.id, row.sign_id, row.sign?.title_vi || row.sign?.slug), { success: "Removed sign from lesson.", reloadContentLesson: true, invalidate: ["bai-hoc"] })}>remove</button>
                    </div>
                  )) : <div className="text-slate-500">(empty)</div>}
                </div>
              </div>

              <div className="rounded-3xl bg-amber-50 p-4">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">Add signs</div>
                <div className="mt-3 space-y-3">
                  <Field label="Lesson"><Select value={lessonItemDraft.lessonId || contentLessonId} onChange={(e) => setLessonItemDraft((prev) => ({ ...prev, lessonId: e.target.value }))}><option value="">-- select --</option>{lessonSelectOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></Field>
                  <Field label="Sign slugs"><Input value={lessonItemDraft.signSlugs} onChange={(e) => setLessonItemDraft((prev) => ({ ...prev, signSlugs: e.target.value }))} placeholder="xin-chao, cam-on" list={ADMIN_SIGN_SLUG_LIST_ID} /></Field>
                  <ActionButton onClick={() => runAction(addSignsToLesson, { success: "Added signs to lesson.", reloadContentLesson: true, invalidate: ["bai-hoc"] })}>Add signs</ActionButton>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 md:p-6">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Quiz admin</div>
                <div className="mt-2 text-2xl font-black text-slate-950">Manage lesson quizzes</div>
                <div className="mt-2 text-sm font-semibold text-slate-500">Flow matches backend: create quiz, create typed question, link question into quiz.</div>
              </div>
              <StatusBadge tone="green">{quizzes.length} quizzes</StatusBadge>
            </div>

            <div className={cx("mt-5 rounded-3xl p-4 transition", quizCreateAvailability.isLocked ? "bg-slate-200/80 ring-1 ring-slate-300" : "bg-slate-50")}>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">Create quiz</div>
              {quizCreateAvailability.isLocked ? (
                <div className="mt-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
                  Lesson {quizCreateAvailability.lessonId} da co {quizCreateAvailability.quizCount} quiz. Moi lesson chi duoc gan 1 quiz.
                </div>
              ) : null}
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <Field label="Title" className="xl:col-span-2"><Input disabled={quizCreateAvailability.isLocked} value={newQuizDraft.title} onChange={(e) => setNewQuizDraft((prev) => ({ ...prev, title: e.target.value }))} placeholder="Lesson quiz title" /></Field>
                <Field label="Passing score"><Input disabled={quizCreateAvailability.isLocked} type="number" min={0} max={100} value={newQuizDraft.passing_score} onChange={(e) => setNewQuizDraft((prev) => ({ ...prev, passing_score: Number(e.target.value || 0) }))} /></Field>
                <Field label="Time limit (sec)"><Input disabled={quizCreateAvailability.isLocked} type="number" min={1} value={newQuizDraft.time_limit_seconds} onChange={(e) => setNewQuizDraft((prev) => ({ ...prev, time_limit_seconds: e.target.value }))} placeholder="Optional" /></Field>
                <Field label="Lesson id"><Input disabled={quizCreateAvailability.isLocked} value={newQuizDraft.lesson_id || contentLessonId} onChange={(e) => setNewQuizDraft((prev) => ({ ...prev, lesson_id: e.target.value }))} /></Field>
              </div>
              <Field label="Description" className="mt-3"><Textarea disabled={quizCreateAvailability.isLocked} rows={2} value={newQuizDraft.description} onChange={(e) => setNewQuizDraft((prev) => ({ ...prev, description: e.target.value }))} placeholder="Optional quiz description" /></Field>
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionButton disabled={quizCreateAvailability.isLocked} onClick={() => runAction(createQuiz, { success: "Created quiz.", reloadContentLesson: true })}>Create quiz</ActionButton>
                <GhostButton onClick={() => setNewQuizDraft(createEmptyQuizDraft({ lesson_id: String(contentLessonId || "") }))}>Reset</GhostButton>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {quizzes.length ? quizzes.map((quiz) => {
                const quizDraft = quizDraftById[quiz.id] || {};
                const questionCreateDraft = newQuestionDraftByQuizId[quiz.id] || createEmptyQuizQuestionDraft();
                const createTypeConfig = getQuizQuestionTypeConfig(questionCreateDraft.question_type);
                return (
                  <div key={quiz.id} className="rounded-3xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-lg font-black text-slate-900">{quiz.title}</div>
                      <StatusBadge tone="green">{quiz.questions?.length || 0} questions</StatusBadge>
                      <StatusBadge tone="amber">pass {quiz.passing_score}</StatusBadge>
                      <StatusBadge>{quiz.time_limit_seconds ? `${quiz.time_limit_seconds}s` : "no limit"}</StatusBadge>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <Field label="Title" className="xl:col-span-2"><Input value={quizDraft.title ?? quiz.title ?? ""} onChange={(e) => setQuizDraftById((prev) => ({ ...prev, [quiz.id]: { ...(prev[quiz.id] || {}), title: e.target.value } }))} /></Field>
                      <Field label="Passing score"><Input type="number" min={0} max={100} value={quizDraft.passing_score ?? quiz.passing_score ?? 70} onChange={(e) => setQuizDraftById((prev) => ({ ...prev, [quiz.id]: { ...(prev[quiz.id] || {}), passing_score: Number(e.target.value || 0) } }))} /></Field>
                      <Field label="Time limit (sec)"><Input type="number" min={1} value={quizDraft.time_limit_seconds ?? quiz.time_limit_seconds ?? ""} onChange={(e) => setQuizDraftById((prev) => ({ ...prev, [quiz.id]: { ...(prev[quiz.id] || {}), time_limit_seconds: e.target.value } }))} placeholder="Optional" /></Field>
                    </div>
                    <Field label="Description" className="mt-3"><Textarea rows={2} value={quizDraft.description ?? quiz.description ?? ""} onChange={(e) => setQuizDraftById((prev) => ({ ...prev, [quiz.id]: { ...(prev[quiz.id] || {}), description: e.target.value } }))} placeholder="Optional quiz description" /></Field>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ActionButton onClick={() => runAction(() => updateQuiz(quiz), { success: `Updated quiz #${quiz.id}.`, reloadContentLesson: true })}>Save quiz</ActionButton>
                      <ActionButton danger onClick={() => runAction(() => deleteQuiz(quiz), { success: `Deleted quiz #${quiz.id}.`, reloadContentLesson: true })}>Delete quiz</ActionButton>
                    </div>

                    <div className="mt-4 rounded-3xl bg-slate-50 p-4">
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">Create question and link</div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <Field label="Question type"><Select value={questionCreateDraft.question_type} onChange={(e) => setNewQuestionDraftByQuizId((prev) => ({ ...prev, [quiz.id]: { ...questionCreateDraft, question_type: e.target.value, options: e.target.value === "sign_to_text" ? [] : (questionCreateDraft.options?.length ? questionCreateDraft.options : [createEmptyQuizOptionDraft()]) } }))}>{QUIZ_QUESTION_TYPE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</Select></Field>
                        <Field label="Order"><Input type="number" min={0} value={questionCreateDraft.order_index} onChange={(e) => setNewQuestionDraftByQuizId((prev) => ({ ...prev, [quiz.id]: { ...questionCreateDraft, order_index: Number(e.target.value || 0) } }))} /></Field>
                        <Field label="Points"><Input type="number" min={1} value={questionCreateDraft.points} onChange={(e) => setNewQuestionDraftByQuizId((prev) => ({ ...prev, [quiz.id]: { ...questionCreateDraft, points: Number(e.target.value || 1) } }))} /></Field>
                        {createTypeConfig.showVideoSlug ? <Field label="Video slug" className="xl:col-span-2"><Input value={questionCreateDraft.video_slug} onChange={(e) => setNewQuestionDraftByQuizId((prev) => ({ ...prev, [quiz.id]: { ...questionCreateDraft, video_slug: e.target.value } }))} placeholder="e.g. xin-chao" list={ADMIN_SIGN_SLUG_LIST_ID} /></Field> : null}
                      </div>
                      <Field label={createTypeConfig.questionTextLabel} className="mt-3"><Textarea rows={2} value={questionCreateDraft.question_text} onChange={(e) => setNewQuestionDraftByQuizId((prev) => ({ ...prev, [quiz.id]: { ...questionCreateDraft, question_text: e.target.value } }))} placeholder={createTypeConfig.questionTextPlaceholder} /></Field>
                      {createTypeConfig.showAnswer ? <Field label={createTypeConfig.answerLabel} className="mt-3"><Input value={questionCreateDraft.answer} onChange={(e) => setNewQuestionDraftByQuizId((prev) => ({ ...prev, [quiz.id]: { ...questionCreateDraft, answer: e.target.value } }))} placeholder={createTypeConfig.answerPlaceholder} /></Field> : null}
                      <div className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-500">{createTypeConfig.helper}</div>

                      {createTypeConfig.showOptions ? (
                        <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">Options</div>
                            <GhostButton type="button" onClick={() => setNewQuestionDraftByQuizId((prev) => ({ ...prev, [quiz.id]: { ...questionCreateDraft, options: [...(questionCreateDraft.options || []), createEmptyQuizOptionDraft()] } }))}>Add option</GhostButton>
                          </div>
                          <div className="mt-2 text-xs font-semibold text-slate-500">Option key tu dong tao trong UI.</div>
                          <div className="mt-3 space-y-3">
                            {(questionCreateDraft.options || []).map((option, optionIndex) => (
                              <div key={`${quiz.id}-new-option-${optionIndex}`} className="grid gap-3 rounded-2xl border border-slate-200 p-3 md:grid-cols-4">
                                <Field label={createTypeConfig.optionValueLabel} className="md:col-span-2"><Input value={option[createTypeConfig.optionValueField] || ""} onChange={(e) => setNewQuestionDraftByQuizId((prev) => ({ ...prev, [quiz.id]: { ...questionCreateDraft, options: (questionCreateDraft.options || []).map((entry, idx) => idx === optionIndex ? { ...entry, [createTypeConfig.optionValueField]: e.target.value } : entry) } }))} placeholder={createTypeConfig.optionValuePlaceholder} list={createTypeConfig.optionValueField === "video_slug" ? ADMIN_SIGN_SLUG_LIST_ID : undefined} /></Field>
                                <div className="flex items-end justify-between gap-3 md:col-span-2">
                                  <label className="flex items-center gap-2 pb-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={!!option.is_correct} onChange={(e) => setNewQuestionDraftByQuizId((prev) => ({ ...prev, [quiz.id]: { ...questionCreateDraft, options: (questionCreateDraft.options || []).map((entry, idx) => idx === optionIndex ? { ...entry, is_correct: e.target.checked } : entry) } }))} />Correct</label>
                                  <button type="button" className="pb-3 text-sm font-black text-rose-600 disabled:text-slate-400" disabled={(questionCreateDraft.options || []).length <= 2} onClick={() => setNewQuestionDraftByQuizId((prev) => ({ ...prev, [quiz.id]: { ...questionCreateDraft, options: (questionCreateDraft.options || []).filter((_, idx) => idx !== optionIndex) } }))}>Remove</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <ActionButton onClick={() => runAction(() => createQuizQuestion(quiz.id), { success: `Created question for quiz #${quiz.id}.`, reloadContentLesson: true })}>Create question</ActionButton>
                        <GhostButton onClick={() => setNewQuestionDraftByQuizId((prev) => ({ ...prev, [quiz.id]: createEmptyQuizQuestionDraft() }))}>Reset</GhostButton>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {(quiz.questions || []).length ? (quiz.questions || []).map((question) => {
                        const draft = questionDraftById[question.id] || {};
                        const questionType = draft.question_type ?? question.question_type;
                        const typeConfig = getQuizQuestionTypeConfig(questionType);
                        const editableOptions = draft.options ?? (question.options || []).map((option) => ({
                          option_key: option.option_key || "",
                          option_text: option.option_text || "",
                          video_slug: option.video_slug || "",
                          is_correct: !!option.is_correct,
                        }));
                        return (
                          <div key={question.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge tone="green">Q#{question.question_id ?? question.id}</StatusBadge>
                              <StatusBadge>{question.question_type}</StatusBadge>
                              <StatusBadge tone="amber">{question.points} pts</StatusBadge>
                              <StatusBadge>order {question.order_index}</StatusBadge>
                            </div>
                            <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">Order/points are stored on the quiz link. Current backend exposes link create only, so this admin UI edits question content and deletes/recreates when order changes are needed.</div>
                            <Field label={typeConfig.questionTextLabel} className="mt-3"><Textarea rows={2} value={draft.question_text ?? question.question_text ?? ""} onChange={(e) => setQuestionDraftById((prev) => ({ ...prev, [question.id]: { ...(prev[question.id] || {}), question_text: e.target.value } }))} placeholder={typeConfig.questionTextPlaceholder} /></Field>
                            {typeConfig.showVideoSlug ? <Field label="Video slug" className="mt-3"><Input value={draft.video_slug ?? question.video_slug ?? ""} onChange={(e) => setQuestionDraftById((prev) => ({ ...prev, [question.id]: { ...(prev[question.id] || {}), video_slug: e.target.value } }))} placeholder="e.g. xin-chao" list={ADMIN_SIGN_SLUG_LIST_ID} /></Field> : null}
                            {typeConfig.showAnswer ? <Field label={typeConfig.answerLabel} className="mt-3"><Input value={draft.answer ?? question.answer ?? ""} onChange={(e) => setQuestionDraftById((prev) => ({ ...prev, [question.id]: { ...(prev[question.id] || {}), answer: e.target.value } }))} placeholder={typeConfig.answerPlaceholder} /></Field> : null}
                            <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">{typeConfig.helper}</div>

                            {typeConfig.showOptions ? (
                              <div className="mt-4 rounded-3xl bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">Options</div>
                                  <GhostButton type="button" onClick={() => setQuestionDraftById((prev) => ({ ...prev, [question.id]: { ...(prev[question.id] || {}), options: [...editableOptions, createEmptyQuizOptionDraft()] } }))}>Add option</GhostButton>
                                </div>
                                <div className="mt-2 text-xs font-semibold text-slate-500">Option key tu dong tao trong UI.</div>
                                <div className="mt-3 space-y-3">
                                  {editableOptions.map((option, optionIndex) => (
                                    <div key={`${question.id}-option-${optionIndex}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-4">
                                      <Field label={typeConfig.optionValueLabel} className="md:col-span-2"><Input value={option[typeConfig.optionValueField] || ""} onChange={(e) => setQuestionDraftById((prev) => ({ ...prev, [question.id]: { ...(prev[question.id] || {}), options: editableOptions.map((entry, idx) => idx === optionIndex ? { ...entry, [typeConfig.optionValueField]: e.target.value } : entry) } }))} placeholder={typeConfig.optionValuePlaceholder} list={typeConfig.optionValueField === "video_slug" ? ADMIN_SIGN_SLUG_LIST_ID : undefined} /></Field>
                                      <div className="flex items-end justify-between gap-3 md:col-span-2">
                                        <label className="flex items-center gap-2 pb-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={!!option.is_correct} onChange={(e) => setQuestionDraftById((prev) => ({ ...prev, [question.id]: { ...(prev[question.id] || {}), options: editableOptions.map((entry, idx) => idx === optionIndex ? { ...entry, is_correct: e.target.checked } : entry) } }))} />Correct</label>
                                        <button type="button" className="pb-3 text-sm font-black text-rose-600 disabled:text-slate-400" disabled={editableOptions.length <= 2} onClick={() => setQuestionDraftById((prev) => ({ ...prev, [question.id]: { ...(prev[question.id] || {}), options: editableOptions.filter((_, idx) => idx !== optionIndex) } }))}>Remove</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            <div className="mt-4 flex flex-wrap gap-2">
                              <ActionButton onClick={() => runAction(() => updateQuizQuestion(question), { success: `Updated question #${question.question_id ?? question.id}.`, reloadContentLesson: true })}>Save question</ActionButton>
                              <ActionButton danger onClick={() => runAction(() => deleteQuizQuestion(question), { success: `Deleted question #${question.question_id ?? question.id}.`, reloadContentLesson: true })}>Delete question</ActionButton>
                            </div>
                          </div>
                        );
                      }) : <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">No questions yet.</div>}
                    </div>
                  </div>
                );
              }) : <EmptyState title="No quiz yet" description="Create a quiz for this lesson, then add typed questions through admin endpoints." />}
            </div>
          </Card>

          <Card className="p-5 md:p-6">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Available sign slugs</div>
            <div className="mt-4 text-sm font-semibold leading-7 text-slate-700">{signSlugOptions.length ? signSlugOptions.slice(0, 120).map((item) => item.slug).join(", ") : "No sign data."}</div>
          </Card>
        </div>
      </div>
    );
  }

  function renderBlogSection() {
    return (
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="p-5 md:p-6">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Create category</div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Name"><Input value={newCategory.name} onChange={(e) => setNewCategory((prev) => ({ ...prev, name: e.target.value }))} /></Field>
              <Field label="Slug"><Input value={newCategory.slug} onChange={(e) => setNewCategory((prev) => ({ ...prev, slug: e.target.value }))} /></Field>
              <Field label="Description" className="md:col-span-2"><Textarea rows={3} value={newCategory.description} onChange={(e) => setNewCategory((prev) => ({ ...prev, description: e.target.value }))} /></Field>
            </div>
            <div className="mt-4"><ActionButton onClick={() => runAction(createCategory, { success: "Created category.", reload: ["blog"] })}>Create category</ActionButton></div>
          </Card>

          <Card className="p-5 md:p-6">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Create post</div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Title"><Input value={newPost.title} onChange={(e) => setNewPost((prev) => ({ ...prev, title: e.target.value }))} /></Field>
              <Field label="Slug"><Input value={newPost.slug} onChange={(e) => setNewPost((prev) => ({ ...prev, slug: e.target.value }))} /></Field>
              <Field label="Status"><Input value={newPost.status} onChange={(e) => setNewPost((prev) => ({ ...prev, status: e.target.value }))} /></Field>
              <Field label="Published at"><Input type="datetime-local" value={newPost.published_at} onChange={(e) => setNewPost((prev) => ({ ...prev, published_at: e.target.value }))} /></Field>
              <Field label="Summary" className="md:col-span-2"><Textarea rows={2} value={newPost.summary} onChange={(e) => setNewPost((prev) => ({ ...prev, summary: e.target.value }))} /></Field>
              <Field label="Content" className="md:col-span-2"><Textarea rows={5} value={newPost.content} onChange={(e) => setNewPost((prev) => ({ ...prev, content: e.target.value }))} /></Field>
            </div>
            <div className="mt-4"><ActionButton onClick={() => runAction(createPost, { success: "Created post.", reload: ["blog"] })}>Create post</ActionButton></div>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Posts</div>
              <StatusBadge>{blogData.posts.length}</StatusBadge>
            </div>
            <div className="mt-4 space-y-3">
              {blogData.posts.length ? blogData.posts.map((item) => (
                <div key={item.id} className="rounded-3xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-lg font-black text-slate-900">{item.title}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">/{item.slug} · {item.status || "draft"}</div>
                      {item.summary ? <div className="mt-2 text-sm font-semibold text-slate-600">{item.summary}</div> : null}
                    </div>
                    <ActionButton danger onClick={() => runAction(() => deletePost(item), { success: `Deleted post #${item.id}.`, reload: ["blog"] })}>Delete</ActionButton>
                  </div>
                </div>
              )) : <EmptyState title="No blog posts" description="Create posts from this admin section." />}
            </div>
          </Card>

          <Card className="p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Categories</div>
              <StatusBadge>{blogData.categories.length}</StatusBadge>
            </div>
            <div className="mt-4 space-y-3">
              {blogData.categories.length ? blogData.categories.map((item) => (
                <div key={item.id} className="rounded-3xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-lg font-black text-slate-900">{item.name}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">/{item.slug}</div>
                      {item.description ? <div className="mt-2 text-sm font-semibold text-slate-600">{item.description}</div> : null}
                    </div>
                    <ActionButton danger onClick={() => runAction(() => deleteCategory(item), { success: `Deleted category #${item.id}.`, reload: ["blog"] })}>Delete</ActionButton>
                  </div>
                </div>
              )) : <EmptyState title="No categories" description="Create categories for blog grouping." />}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  function renderAiSection() {
    return (
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">AI model</div>
              {aiData.modelError ? <StatusBadge tone="rose">error</StatusBadge> : <StatusBadge tone="green">ok</StatusBadge>}
            </div>
            <div className="mt-4">{aiData.model ? <JsonPreview value={aiData.model} /> : <EmptyState title="No model payload" description={aiData.modelError || "Backend returned no model payload."} />}</div>
          </Card>

          <Card className="p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">AI labels</div>
              <StatusBadge>{aiData.labels.length}</StatusBadge>
            </div>
            <div className="mt-4 space-y-3">
              {aiData.labels.length ? aiData.labels.map((item, index) => (
                <div key={`${item?.label || item?.slug || index}`} className="rounded-3xl border border-slate-200 p-4">
                  <div className="text-sm font-black text-slate-900">{item?.label || item?.slug || `label-${index + 1}`}</div>
                  <div className="mt-2 text-xs font-semibold text-slate-500">{item?.sign_slug || item?.reference_video || item?.version || "AI label row"}</div>
                </div>
              )) : <EmptyState title="No labels" description={aiData.labelsError || "Backend returned no AI label rows."} />}
            </div>
          </Card>
        </div>

        <Card className="p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">AI scoring config by sign slug</div>
            {aiConfigLoading ? <StatusBadge tone="amber">loading</StatusBadge> : null}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Sign slug" className="xl:col-span-1">
              <Select value={aiConfigSlug} onChange={(e) => setAiConfigSlug(e.target.value)}>
                <option value="">-- Chon sign slug --</option>
                {signSlugOptions.map((item) => <option key={item.slug} value={item.slug}>{item.label} ({item.slug})</option>)}
              </Select>
            </Field>
            <div className="flex flex-wrap items-end gap-2 xl:col-span-2">
              <GhostButton type="button" onClick={() => runAction(loadAiConfigBySlug, { success: "Loaded AI config." })}>Load config</GhostButton>
              <ActionButton type="button" onClick={() => runAction(saveAiConfigBySlug, { success: "Saved AI config.", reload: ["ai"] })}>Save config</ActionButton>
            </div>

            <Field label="Algorithm">
              <Input value={aiConfigDraft.algorithm} onChange={(e) => setAiConfigDraft((prev) => ({ ...prev, algorithm: e.target.value }))} />
            </Field>
            <Field label="Hand weight">
              <Input value={aiConfigDraft.handWeight} onChange={(e) => setAiConfigDraft((prev) => ({ ...prev, handWeight: e.target.value }))} />
            </Field>
            <Field label="Pose weight">
              <Input value={aiConfigDraft.poseWeight} onChange={(e) => setAiConfigDraft((prev) => ({ ...prev, poseWeight: e.target.value }))} />
            </Field>
            <Field label="Speed weight">
              <Input value={aiConfigDraft.speedWeight} onChange={(e) => setAiConfigDraft((prev) => ({ ...prev, speedWeight: e.target.value }))} />
            </Field>
            <Field label="Missing hand penalty">
              <Input value={aiConfigDraft.missingHandPenalty} onChange={(e) => setAiConfigDraft((prev) => ({ ...prev, missingHandPenalty: e.target.value }))} />
            </Field>
            <Field label="Excellent threshold">
              <Input value={aiConfigDraft.excellentThreshold} onChange={(e) => setAiConfigDraft((prev) => ({ ...prev, excellentThreshold: e.target.value }))} />
            </Field>
            <Field label="Good threshold">
              <Input value={aiConfigDraft.goodThreshold} onChange={(e) => setAiConfigDraft((prev) => ({ ...prev, goodThreshold: e.target.value }))} />
            </Field>
            <Field label="Pass threshold">
              <Input value={aiConfigDraft.passThreshold} onChange={(e) => setAiConfigDraft((prev) => ({ ...prev, passThreshold: e.target.value }))} />
            </Field>
          </div>
        </Card>
      </div>
    );
  }

  function renderPracticeSection() {
    return (
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Practice attempts" value={practiceData.attempts.length} helper={practiceData.attemptsError || "Admin endpoint"} />
          <StatCard label="Practice sessions" value={practiceData.sessions.length} helper={practiceData.sessionsError || "General endpoint"} />
          <StatCard label="Attempt source" value="/api/v1/admin/practice-attempts" />
          <StatCard label="Session source" value="/api/v1/practice/sessions" />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="p-5 md:p-6">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Attempts</div>
            <div className="mt-4 space-y-3">
              {practiceData.attempts.length ? practiceData.attempts.map((item, index) => (
                <div key={item.id || item.attempt_id || index} className="rounded-3xl border border-slate-200 p-4">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone="amber">{item.label || item.sign_slug || "attempt"}</StatusBadge>
                    <StatusBadge tone="green">score {item.final_score ?? item.score ?? "-"}</StatusBadge>
                  </div>
                  <div className="mt-3 text-sm font-semibold text-slate-700">User {item.user_id ?? "-"} · Lesson {item.lesson_id ?? "-"}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Completed {formatDate(item.completed_at || item.created_at)}</div>
                </div>
              )) : <EmptyState title="No attempts" description={practiceData.attemptsError || "No admin practice attempts returned."} />}
            </div>
          </Card>

          <Card className="p-5 md:p-6">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Sessions</div>
            <div className="mt-4 space-y-3">
              {practiceData.sessions.length ? practiceData.sessions.map((item, index) => (
                <div key={item.id || item.practice_session_id || index} className="rounded-3xl border border-slate-200 p-4">
                  <div className="text-sm font-black text-slate-900">Session #{item.id || item.practice_session_id || index + 1}</div>
                  <div className="mt-2 text-sm font-semibold text-slate-700">User {item.user_id ?? "-"} · Lesson {item.lesson_id ?? "-"}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Started {formatDate(item.started_at || item.created_at)}</div>
                </div>
              )) : <EmptyState title="No sessions" description={practiceData.sessionsError || "No practice sessions returned."} />}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  function renderSectionBody() {
    if (activeSectionState.status === "loading" && !activeSectionState.data) {
      return <EmptyState title="Loading..." description="Data will load only when this section is opened." />;
    }

    if (activeSectionState.status === "error") {
      return <EmptyState title="Load failed" description={activeSectionState.error} />;
    }

    if (activeSection === "tong-quan") return renderOverviewSection();
    if (activeSection === "nguoi-dung") return renderUsersSection();
    if (activeSection === "khoa-hoc") return renderCoursesSection();
    if (activeSection === "bai-hoc") return renderLessonsSection();
    if (activeSection === "noi-dung-mooc") return renderContentSection();
    if (activeSection === "blog") return renderBlogSection();
    if (activeSection === "ai") return renderAiSection();
    if (activeSection === "practice") return renderPracticeSection();
    return null;
  }

  const currentSectionMeta = SECTION_DEFS.find((item) => item.id === activeSection) || SECTION_DEFS[0];

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f4f7f2_0%,#fcfaf5_45%,#eef7ff_100%)] text-slate-900">
      <div className="mx-auto w-full max-w-[1680px] px-4 py-4 md:px-6 md:py-6 xl:px-8">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="bg-slate-950 px-5 py-6 text-white md:px-6">
              <div className="text-sm font-black uppercase tracking-[0.28em] text-emerald-300 md:text-base">SignLearn admin</div>

            </div>

            <div className="flex flex-col gap-4 border-b border-slate-100 p-4 md:p-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="w-full max-w-[300px] rounded-[2rem] bg-slate-50 p-5 md:p-6">
                <div className="text-lg font-black text-slate-900">{user?.full_name || user?.email || "admin"}</div>
                <div className="mt-1 text-sm font-semibold text-slate-500">{user?.role || "admin"}</div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <GhostButton className="min-h-12 px-6 text-lg font-black" onClick={onOpenUserUi}>{'Xem UI ng\u01b0\u1eddi d\u00f9ng'}</GhostButton>
                  <ActionButton className="min-h-12 px-6 text-lg font-black" danger onClick={onLogout}>{'\u0110\u0103ng xu\u1ea5t'}</ActionButton>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 xl:justify-end">
                {SECTION_DEFS.map((item) => {
                  const isActive = item.id === activeSection;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigateTo(makeDashboardPath(item.id))}
                      className={cx(
                        "rounded-2xl border px-5 py-3 text-base font-black transition",
                        isActive ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

        <main className="space-y-6">
          <Card className="overflow-hidden">
            <div className="grid gap-5 bg-[radial-gradient(circle_at_top_left,#d9f99d_0%,#f8fafc_32%,#ffffff_100%)] p-5 md:p-6 xl:grid-cols-[1.3fr_0.7fr]">
              <div>
                <h1 className="mt-3 max-w-3xl text-4xl font-black text-slate-950">{currentSectionMeta.label}</h1>

              </div>

            </div>
          </Card>

          {notice.error ? <div className="rounded-3xl bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">{notice.error}</div> : null}
          {notice.success ? <div className="rounded-3xl bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">{notice.success}</div> : null}

          <SectionPanel
            title={currentSectionMeta.label}
            description={`Section id: ${activeSection}. Data source flows from https://api.signlearn.id.vn/ via existing auth token.`}
            action={activeSectionState.status === "loading" ? <StatusBadge tone="amber">loading</StatusBadge> : activeSectionState.status === "ready" ? <StatusBadge tone="green">ready</StatusBadge> : null}
          >
            {renderSectionBody()}
          </SectionPanel>
        </main>
        </div>
      </div>
    </div>
  );
}


