import React, { useMemo } from "react";
import { computeHomeOverview } from "../app/lib/homeOverview.js";
import { getVisibleHomeTopics } from "../app/lib/homeCatalog.js";

function formatDate(value) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(parsed);
}

function getDisplayName(user) {
  return user?.full_name || user?.name || user?.email || "Học viên";
}

function StatCard({ label, value, hint, valueClassName = "text-slate-900" }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>

      <div className={`mt-3 text-4xl font-black tracking-tight ${valueClassName}`}>
        {value}
      </div>

      <div className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {hint}
      </div>
    </div>
  );
}

function getTopicProgress(topic, moocsByTopic, courseProgressByCourseId) {
  const detail = courseProgressByCourseId?.[topic.courseId];
  const moocs = moocsByTopic?.[topic.id] || [];
  const backendLessons = Array.isArray(detail?.lessons) ? detail.lessons : [];
  const completed = backendLessons.filter((lesson) => lesson.status === "completed" || Number(lesson.progress_percent || 0) >= 100).length;
  const percent = detail?.progress ? Number(detail.progress.progress_percent || 0) : moocs.length ? Math.round((completed / moocs.length) * 100) : 0;
  const nextLesson = backendLessons.find((lesson) => lesson.status !== "completed" && Number(lesson.progress_percent || 0) < 100);
  return { total: moocs.length || backendLessons.length, completed, percent: Math.max(0, Math.min(100, Math.round(percent))), nextLesson };
}

function RecentActivity({ quizHistory, practiceSessions }) {
  const rows = [
    ...(quizHistory || []).slice(0, 3).map((item) => ({
      id: `quiz-${item.attempt_id || item.quiz_id}`,
      label: item.quiz_title || "Quiz",
      meta: `Quiz ${Math.round(Number(item.score || 0))} điểm`,
      time: item.submitted_at || item.started_at,
    })),
    ...(practiceSessions || []).slice(0, 3).map((item) => ({
      id: `practice-${item.id}`,
      label: item.lesson_id ? `Luyện tập lesson #${item.lesson_id}` : "Luyện tập tự do",
      meta: item.ended_at ? "Đã kết thúc" : "Đang mở",
      time: item.ended_at || item.started_at,
    })),
  ]
    .sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime())
    .slice(0, 5);

  if (!rows.length) {
    return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm font-semibold text-slate-500">Chưa có hoạt động mới từ API.</div>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-black text-slate-900">{row.label}</div>
          <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs font-semibold text-slate-500">
            <span>{row.meta}</span>
            <span>{formatDate(row.time)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home({
  currentUser,
  topics = [],
  moocsByTopic = {},
  courseProgressByCourseId = {},
  quizHistory = [],
  practiceSessions = [],
  catalogLoading = false,
  catalogError = "",
  catalogSource = "api",
  insightsLoading = false,
  setPage,
  openTopic,
  onOpenContinueLesson,
  onRefreshOverview,
}) {
  const overview = useMemo(() => computeHomeOverview({
    topics,
    moocsByTopic,
    courseProgressByCourseId,
    quizHistory,
    practiceSessions,
  }), [courseProgressByCourseId, moocsByTopic, practiceSessions, quizHistory, topics]);

  const displayName = getDisplayName(currentUser);
  const visibleTopics = getVisibleHomeTopics(topics);

  return (
    <main className="mx-auto w-full max-w-[1600px] px-5 py-8 md:px-8 md:py-10">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
          <div className="rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-100 via-white to-amber-100 p-6 text-slate-900 shadow-xl shadow-blue-100/50 md:p-8">
          <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500 ring-1 ring-white/10">
            Trang tổng quan
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-6xl">Xin chào, {displayName}</h1>
          <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-slate-500">
            Theo dõi tiến độ, mở lại bài đang học và xem hoạt động học tập gần nhất của bạn
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => overview.continueItem ? onOpenContinueLesson?.(overview.continueItem) : setPage?.("learning")}
              className="min-h-12 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Tiếp tục học
            </button>
            <button
              type="button"
              onClick={() => setPage?.("blogs")}
              className="min-h-12 rounded-2xl bg-white px-6 py-3 text-sm font-black text-slate-900 shadow-sm ring-1 ring-blue-100 transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
              Đọc blog
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Tiến độ" value={`${overview.completionPercent}%`} hint="Trung bình tiến độ các course" />
          <StatCard label="Streak" value={`${overview.streakDays} ngày`} hint="Tính từ quiz history và practice sessions." valueClassName="text-amber-400" />
          <StatCard label="Bài hoàn thành" value={`${overview.completedLessons}/${overview.totalLessons}`} hint="Lesson đã hoàn tất trong course progress." />
          <StatCard label="Quiz trung bình" value={overview.avgQuizScore || "--"} hint="Điểm trung bình quiz của bạn." />
        </div>
      </section>

      {(catalogError || catalogLoading || insightsLoading) && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600 shadow-sm">
          {catalogLoading || insightsLoading ? "Đang đồng bộ dữ liệu API..." : catalogError}
          <button type="button" onClick={onRefreshOverview} className="ml-3 font-black text-blue-700 hover:text-blue-800">Tải lại</button>
        </section>
      )}

      <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-blue-100 bg-blue-50 p-6 md:p-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Bài đang chờ</div>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  {overview.continueItem ? overview.continueItem.lessonTitle : "Chọn một chủ đề để bắt đầu"}
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  {overview.continueItem
                    ? `${overview.continueItem.topicTitle} - ${overview.continueItem.progressPercent}% đã học`
                    : "Dữ liệu API chưa có lesson đang học, bạn có thể bắt đầu từ danh sách chủ đề."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => overview.continueItem ? onOpenContinueLesson?.(overview.continueItem) : setPage?.("learning")}
                className="min-h-12 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
              >
                Mở bài
              </button>
            </div>
            {overview.continueItem && (
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${overview.continueItem.progressPercent}%` }} />
              </div>
            )}
          </div>

          <section>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="mt-2 text-3xl font-black text-slate-900">Lộ trình học tập</h2>
              </div>
            </div>
            {!visibleTopics.length ? (
              <div className="mt-5 rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm">
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {visibleTopics.map((topic) => {
                  const topicProgress = getTopicProgress(topic, moocsByTopic, courseProgressByCourseId);
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => openTopic?.(topic.id)}
                      className="rounded-[1.75rem] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{topic.level || "course"}</div>
                          <h3 className="mt-2 text-xl font-black leading-tight text-slate-900">{topic.title}</h3>
                        </div>
                        <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700">{topicProgress.percent}%</div>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">{topic.desc || "Course đang được đồng bộ từ backend."}</p>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${topicProgress.percent}%` }} />
                      </div>
                      <div className="mt-3 text-xs font-semibold text-slate-500">
                        {topicProgress.completed}/{topicProgress.total || 0} lesson hoàn thành
                        {topicProgress.nextLesson ? ` - tiếp theo: ${topicProgress.nextLesson.title}` : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Người dùng</div>
            <h2 className="mt-2 text-2xl font-black text-slate-900">{displayName}</h2>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-4">Email: <span className="font-black text-slate-900 break-all">{currentUser?.email || "--"}</span></div>
              <div className="rounded-2xl bg-slate-50 p-4">Vai trò: <span className="font-black text-slate-900">{currentUser?.role || "--"}</span></div>
              <div className="rounded-2xl bg-slate-50 p-4">User ID: <span className="font-black text-slate-900">{currentUser?.id || "--"}</span></div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Hoạt động gần nhất</div>
            <div className="mt-5">
              <RecentActivity quizHistory={quizHistory} practiceSessions={practiceSessions} />
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
