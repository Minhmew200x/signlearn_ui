import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "./components/app/AppShell.jsx";
import { USE_BACKEND_COURSES, LEARNING_PROGRESS_STORAGE_KEY } from "./app/constants.js";
import { apiRequest, assertListResponseShape } from "./app/lib/api.js";
import { composeTopicCatalog, mapCourseDetailsToMoocs, mapCoursesToTopics } from "./app/lib/catalog.js";
import { getMaterialKeyForMooc, loadLessonMaterial, makeSignVideoEndpoint } from "./app/lib/material.js";
import { normalizeProgress, updateProgressAfterConfirm, updateProgressAfterScore } from "./app/lib/progress.js";
import { getCurrentPathname, makeAiPath, makeBlogPath, makeHomePath, makeLessonPath, makeProfilePath, makeTopicPath, parseAppPath } from "./app/lib/routing.js";
import Home from "./pages/Home.jsx";
import Blogs from "./pages/Blogs.jsx";
import LearningDashboard from "./pages/LearningDashboard.jsx";
import TopicMoocPage from "./pages/TopicMoocPage.jsx";
import LessonPage from "./pages/LessonPage.jsx";
import AIPracticePage from "./pages/AIPracticePage.jsx";
import HoSo from "./components/app/ho_so.jsx";

export default function SignlearnApp({ currentUser = null, accessToken = "", onLogout, onUserUpdate }) {
  const [pathname, setPathname] = useState(() => getCurrentPathname());
  const [catalogTopics, setCatalogTopics] = useState([]);
  const [catalogMoocsByTopic, setCatalogMoocsByTopic] = useState({});
  const [catalogSource, setCatalogSource] = useState("api");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [quizHistory, setQuizHistory] = useState([]);
  const [practiceSessions, setPracticeSessions] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState("");

  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [selectedMoocIndex, setSelectedMoocIndex] = useState(0);
  const [lessonMaterialById, setLessonMaterialById] = useState({});
  const [loadingLessonId, setLoadingLessonId] = useState(null);
  const [courseProgressByCourseId, setCourseProgressByCourseId] = useState({});

  const [progress, setProgress] = useState(() => {
    let saved = {};
    try {
      const raw = localStorage.getItem(LEARNING_PROGRESS_STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {
      saved = {};
    }
    return normalizeProgress(saved, [], {});
  });

  useEffect(() => {
    setProgress((prev) => normalizeProgress(prev, catalogTopics, catalogMoocsByTopic));
  }, [catalogTopics, catalogMoocsByTopic]);

  useEffect(() => {
    try {
      localStorage.setItem(LEARNING_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Bo qua neu trinh duyet chan localStorage.
    }
  }, [progress]);

  useEffect(() => {
    if (!catalogTopics.length) {
      setSelectedTopicId("");
      setSelectedMoocIndex(0);
      return;
    }

    if (!catalogTopics.some((topic) => topic.id === selectedTopicId)) {
      setSelectedTopicId(catalogTopics[0].id);
      setSelectedMoocIndex(0);
    }
  }, [catalogTopics, selectedTopicId]);

  useEffect(() => {
    function handlePopState() {
      setPathname(getCurrentPathname());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const routeState = useMemo(() => parseAppPath(pathname), [pathname]);

  const navigateTo = useCallback((nextPath, { replace = false } = {}) => {
    const normalizedPath = nextPath && nextPath !== "/" ? nextPath.replace(/\/+$/, "") : "/";
    const target = normalizedPath || "/";
    const current = getCurrentPathname();

    if (current !== target) {
      window.history[replace ? "replaceState" : "pushState"]({}, "", target);
    }

    setPathname(target);
  }, []);

  const setPage = useCallback((nextPage) => {
    if (nextPage === "home") return navigateTo(makeHomePath());
    if (nextPage === "blogs") return navigateTo(makeBlogPath());
    if (nextPage === "learning") return navigateTo("/hoc-tap");
    if (nextPage === "profile") return navigateTo(makeProfilePath());

    const fallbackTopicId = selectedTopicId || catalogTopics[0]?.id;
    if (!fallbackTopicId) return navigateTo("/hoc-tap");

    if (nextPage === "topic") return navigateTo(makeTopicPath(fallbackTopicId));
    if (nextPage === "lesson") return navigateTo(makeLessonPath(fallbackTopicId, selectedMoocIndex));
    if (nextPage === "ai") return navigateTo(makeAiPath(fallbackTopicId, selectedMoocIndex));
  }, [catalogTopics, navigateTo, selectedMoocIndex, selectedTopicId]);

  useEffect(() => {
    if (!["topic", "lesson", "ai"].includes(routeState.page)) return;

    const routeTopicId = routeState.topicId;
    if (!routeTopicId) {
      navigateTo("/hoc-tap", { replace: true });
      return;
    }

    const topicExists = catalogTopics.some((topic) => topic.id === routeTopicId);
    if (!topicExists) {
      navigateTo("/hoc-tap", { replace: true });
      return;
    }

    if (selectedTopicId !== routeTopicId) {
      setSelectedTopicId(routeTopicId);
    }

    const moocs = catalogMoocsByTopic[routeTopicId] || [];
    const maxIndex = Math.max(0, moocs.length - 1);
    const routeMoocIndex = Number.isInteger(routeState.moocIndex) ? routeState.moocIndex : 0;
    const nextMoocIndex = Math.min(routeMoocIndex, maxIndex);

    if (routeState.page === "topic") {
      if (selectedMoocIndex !== 0) setSelectedMoocIndex(0);
      return;
    }

    if (!moocs.length) {
      navigateTo(makeTopicPath(routeTopicId), { replace: true });
      return;
    }

    if (routeState.moocIndex !== nextMoocIndex) {
      const targetPath = routeState.page === "ai"
        ? makeAiPath(routeTopicId, nextMoocIndex)
        : makeLessonPath(routeTopicId, nextMoocIndex);
      navigateTo(targetPath, { replace: true });
      return;
    }

    if (selectedMoocIndex !== nextMoocIndex) {
      setSelectedMoocIndex(nextMoocIndex);
    }
  }, [catalogMoocsByTopic, catalogTopics, navigateTo, routeState, selectedMoocIndex, selectedTopicId]);

  const refreshCourseProgress = useCallback(async (courseIds) => {
    if (!accessToken || !Array.isArray(courseIds) || courseIds.length === 0) {
      setCourseProgressByCourseId({});
      return;
    }

    const uniqueCourseIds = [...new Set(courseIds.map((value) => Number(value)).filter(Boolean))];
    const results = await Promise.allSettled(
      uniqueCourseIds.map((courseId) => apiRequest(`/api/v1/progress/me/courses/${courseId}`, { accessToken }))
    );

    const nextMap = {};
    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value) {
        nextMap[uniqueCourseIds[index]] = result.value;
      }
    });

    setCourseProgressByCourseId(nextMap);
  }, [accessToken]);

  const patchLessonProgress = useCallback(async ({ lessonId, progressPercent, status }) => {
    if (!accessToken || !lessonId) return;

    await apiRequest(`/api/v1/progress/me/lessons/${lessonId}`, {
      method: "PATCH",
      accessToken,
      body: {
        progress_percent: Math.max(0, Math.min(100, Number(progressPercent || 0))),
        status,
      },
    });
  }, [accessToken]);

  const loadUserInsights = useCallback(async () => {
    if (!accessToken) {
      setQuizHistory([]);
      setPracticeSessions([]);
      setInsightsError("");
      return;
    }

    setInsightsLoading(true);
    setInsightsError("");
    const [quizResult, practiceResult] = await Promise.allSettled([
      apiRequest("/api/v1/users/me/quiz-history", { accessToken }),
      apiRequest("/api/v1/practice/sessions/me", { accessToken, query: { skip: 0, limit: 50 } }),
    ]);

    if (quizResult.status === "fulfilled") {
      setQuizHistory(Array.isArray(quizResult.value?.items) ? quizResult.value.items : []);
    } else {
      setQuizHistory([]);
    }

    if (practiceResult.status === "fulfilled") {
      setPracticeSessions(Array.isArray(practiceResult.value?.items) ? practiceResult.value.items : []);
    } else {
      setPracticeSessions([]);
    }

    const firstError = [quizResult, practiceResult].find((result) => result.status === "rejected")?.reason;
    if (firstError) {
      setInsightsError(firstError?.message || "Không tải được dữ liệu tổng quan.");
    }
    setInsightsLoading(false);
  }, [accessToken]);

  useEffect(() => {
    loadUserInsights();
  }, [loadUserInsights]);

  const loadCatalogFromApi = useCallback(async () => {
    if (!USE_BACKEND_COURSES) {
      setCatalogTopics([]);
      setCatalogMoocsByTopic({});
      setCatalogSource("api");
      setCatalogError("");
      setCourseProgressByCourseId({});
      return;
    }

    if (!accessToken) return;

    setCatalogLoading(true);
    setCatalogError("");
    try {
      const query = { skip: 0, limit: 50 };
      if (currentUser?.role === "admin") query.include_unpublished = true;

      const courseList = await apiRequest("/api/v1/courses", { accessToken, query });
      const courses = assertListResponseShape(courseList, "CourseListResponse");
      const topicsFromApi = mapCoursesToTopics(courses);

      const detailsResults = await Promise.allSettled(
        courses.map((course) => apiRequest(`/api/v1/courses/${course.id}`, { accessToken }))
      );

      const detailsByCourseId = {};
      detailsResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          detailsByCourseId[courses[index].id] = result.value;
        }
      });

      const moocsFromApi = mapCourseDetailsToMoocs(topicsFromApi, detailsByCourseId);
      const composedCatalog = composeTopicCatalog(topicsFromApi, moocsFromApi);

      setCatalogTopics(composedCatalog.topics);
      setCatalogMoocsByTopic(composedCatalog.moocsByTopic);
      setCatalogSource(composedCatalog.source);
      await refreshCourseProgress(courses.map((course) => course.id));
    } catch (error) {
      setCatalogError(error?.message || "Không tải được danh sách khóa học từ API.");
      setCatalogTopics([]);
      setCatalogMoocsByTopic({});
      setCatalogSource("api");
      setCourseProgressByCourseId({});
    } finally {
      setCatalogLoading(false);
    }
  }, [accessToken, currentUser?.role, refreshCourseProgress]);

  useEffect(() => {
    loadCatalogFromApi();
  }, [loadCatalogFromApi]);

  const currentTopic = useMemo(
    () => catalogTopics.find((topic) => topic.id === selectedTopicId) || null,
    [catalogTopics, selectedTopicId]
  );
  const currentMoocs = useMemo(
    () => (currentTopic ? catalogMoocsByTopic[currentTopic.id] || [] : []),
    [catalogMoocsByTopic, currentTopic]
  );
  const currentMooc = currentMoocs[selectedMoocIndex] || null;
  const currentTopicProgress = useMemo(() => {
    if (!currentTopic) return { unlockedMooc: 1, bestScores: {}, completedMoocs: {}, progressPercent: 0 };

    const localProgress = progress[currentTopic.id] || { unlockedMooc: 1, bestScores: {}, completedMoocs: {} };
    const backendProgress = courseProgressByCourseId[currentTopic.courseId];

    if (!backendProgress?.lessons?.length) {
      return { ...localProgress, progressPercent: 0 };
    }

    const completedMoocs = { ...(localProgress.completedMoocs || {}) };
    let unlockedMooc = 1;

    backendProgress.lessons.forEach((lessonProgress, index) => {
      const isCompleted = lessonProgress?.status === "completed" || Number(lessonProgress?.progress_percent || 0) >= 100;
      if (isCompleted) {
        completedMoocs[index] = true;
        unlockedMooc = Math.max(unlockedMooc, index + 2);
      }
    });

    return {
      ...localProgress,
      completedMoocs,
      unlockedMooc: Math.min(Math.max(currentMoocs.length, 1), unlockedMooc),
      progressPercent: Number(backendProgress?.progress?.progress_percent || 0),
    };
  }, [courseProgressByCourseId, currentMoocs.length, currentTopic, progress]);
  const currentMaterialKey = getMaterialKeyForMooc(currentMooc);
  const currentLessonMaterial = currentMaterialKey ? lessonMaterialById[currentMaterialKey] : null;

  const ensureLessonMaterial = useCallback(async (mooc) => {
    const materialKey = getMaterialKeyForMooc(mooc);
    if (!materialKey || lessonMaterialById[materialKey] || loadingLessonId === materialKey) return;

    setLoadingLessonId(materialKey);
    try {
      const material = await loadLessonMaterial({ mooc, accessToken });
      if (material) {
        setLessonMaterialById((prev) => ({ ...prev, [materialKey]: material }));
      }
    } catch (error) {
      console.error("Không tải được video/chi tiết lesson:", error);
      setCatalogError(error?.message || "Không tải được video/chi tiết lesson.");
    } finally {
      setLoadingLessonId((prev) => (prev === materialKey ? null : prev));
    }
  }, [accessToken, lessonMaterialById, loadingLessonId]);

  useEffect(() => {
    ensureLessonMaterial(currentMooc);
  }, [currentMooc, ensureLessonMaterial]);

  useEffect(() => {
    if (routeState.page !== "lesson" || !currentMooc?.lessonId || !currentTopic?.courseId) return;

    patchLessonProgress({
      lessonId: currentMooc.lessonId,
      progressPercent: 10,
      status: "in_progress",
    })
      .then(() => refreshCourseProgress([currentTopic.courseId]))
      .catch(() => {});
  }, [currentMooc?.lessonId, currentTopic?.courseId, patchLessonProgress, refreshCourseProgress, routeState.page]);

  function openTopic(topicId) {
    setSelectedTopicId(topicId);
    setSelectedMoocIndex(0);
    navigateTo(makeTopicPath(topicId));
  }

  function openMooc(index) {
    if (!currentTopic) return;
    setSelectedMoocIndex(index);
    navigateTo(makeLessonPath(currentTopic.id, index));
  }

  function handleAiScore(score) {
    if (!currentTopic) return;
    setProgress((prev) => updateProgressAfterScore(prev, {
      topicId: currentTopic.id,
      currentMoocs,
      selectedMoocIndex,
      score,
    }));
  }

  async function handleConfirmMoocComplete() {
    if (!currentTopic) return;
    setProgress((prev) => updateProgressAfterConfirm(prev, {
      topicId: currentTopic.id,
      currentMoocs,
      selectedMoocIndex,
    }));

    if (!currentMooc?.lessonId || !currentTopic?.courseId) return;

    const hasQuiz = Boolean(currentLessonMaterial?.quiz?.detail?.questions?.length);
    await patchLessonProgress({
      lessonId: currentMooc.lessonId,
      progressPercent: hasQuiz ? 70 : 100,
      status: hasQuiz ? "in_progress" : "completed",
    });
    await refreshCourseProgress([currentTopic.courseId]);
  }

  async function handleQuizCompleted(result) {
    if (!currentTopic || !result?.passed) return;

    setProgress((prev) => updateProgressAfterScore(prev, {
      topicId: currentTopic.id,
      currentMoocs,
      selectedMoocIndex,
      score: Number(result.score || 0),
    }));

    if (!currentMooc?.lessonId || !currentTopic?.courseId) return;

    await patchLessonProgress({
      lessonId: currentMooc.lessonId,
      progressPercent: 100,
      status: "completed",
    });
    await refreshCourseProgress([currentTopic.courseId]);
  }

  function goToNextMooc() {
    if (!currentTopic) return;
    const next = selectedMoocIndex + 1;
    if (next >= currentMoocs.length) {
      navigateTo(makeTopicPath(currentTopic.id));
      return;
    }
    setSelectedMoocIndex(next);
    navigateTo(makeLessonPath(currentTopic.id, next));
  }

  const contentByPage = {
    home: (
      <Home
        currentUser={currentUser}
        topics={catalogTopics}
        moocsByTopic={catalogMoocsByTopic}
        courseProgressByCourseId={courseProgressByCourseId}
        quizHistory={quizHistory}
        practiceSessions={practiceSessions}
        catalogLoading={catalogLoading}
        catalogError={catalogError || insightsError}
        catalogSource={catalogSource}
        insightsLoading={insightsLoading}
        setPage={setPage}
        openTopic={openTopic}
        onOpenContinueLesson={(item) => item?.href && navigateTo(item.href)}
        onRefreshOverview={loadUserInsights}
      />
    ),
    blogs: <Blogs currentUser={currentUser} accessToken={accessToken} blogSlug={routeState.blogSlug || ""} navigateTo={navigateTo} />,
    learning: (
      <LearningDashboard
        currentUser={currentUser}
        accessToken={accessToken}
        progress={progress}
        courseProgressByCourseId={courseProgressByCourseId}
        topics={catalogTopics}
        moocsByTopic={catalogMoocsByTopic}
        setPage={setPage}
        openTopic={openTopic}
        onLogout={onLogout}
        onUserUpdate={onUserUpdate}
        onRefreshCatalog={loadCatalogFromApi}
        catalogLoading={catalogLoading}
        catalogError={catalogError}
        catalogSource={catalogSource}
        quizHistory={quizHistory}
        practiceSessions={practiceSessions}
        onOpenProfilePage={() => navigateTo(makeProfilePath())}
      />
    ),
    profile: (
      <main className="mx-auto w-full max-w-[1180px] px-5 py-10">
        <HoSo
          mode="standalone"
          currentUser={currentUser}
          accessToken={accessToken}
          progress={progress}
          courseProgressByCourseId={courseProgressByCourseId}
          topics={catalogTopics}
          moocsByTopic={catalogMoocsByTopic}
          onLogout={onLogout}
          onUserUpdate={onUserUpdate}
          onBackToLearning={() => navigateTo("/hoc-tap")}
        />
      </main>
    ),
    topic: (
      <TopicMoocPage
        topic={currentTopic}
        moocs={currentMoocs}
        topicProgress={currentTopicProgress}
        courseProgress={currentTopic?.courseId ? courseProgressByCourseId[currentTopic.courseId] : null}
        onBack={() => navigateTo("/hoc-tap")}
        onOpenMooc={openMooc}
      />
    ),
    lesson: (
      <LessonPage
        topic={currentTopic}
        moocs={currentMoocs}
        moocIndex={selectedMoocIndex}
        onBack={() => currentTopic && navigateTo(makeTopicPath(currentTopic.id))}
        onConfirmCompleteMooc={handleConfirmMoocComplete}
        onQuizCompleted={handleQuizCompleted}
        onGoNextMooc={goToNextMooc}
        onCompleteMooc={() => currentTopic && navigateTo(makeAiPath(currentTopic.id, selectedMoocIndex))}
        lessonMaterial={currentLessonMaterial}
        loadingMaterial={loadingLessonId === currentMaterialKey}
        makeSignVideoEndpoint={makeSignVideoEndpoint}
        accessToken={accessToken}
      />
    ),
    ai: (
      <AIPracticePage
        topic={currentTopic}
        mooc={currentMooc}
        moocs={currentMoocs}
        lessonMaterial={currentLessonMaterial}
        onBack={() => currentTopic && navigateTo(makeLessonPath(currentTopic.id, selectedMoocIndex))}
        onBackToMoocList={() => currentTopic && navigateTo(makeTopicPath(currentTopic.id))}
        onScore={handleAiScore}
        onGoNext={goToNextMooc}
      />
    ),
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <Header page={routeState.page} setPage={setPage} />
      {contentByPage[routeState.page] || contentByPage.home}
    </div>
  );
}
