import React, { useMemo } from "react";
import HoSo from "../components/app/ho_so.jsx";
import { computeHomeOverview } from "../app/lib/homeOverview.js";

function getTopicProgress(topic, moocsByTopic, courseProgressByCourseId) {
  const moocs = moocsByTopic?.[topic.id] || [];
  const detail = courseProgressByCourseId?.[topic.courseId];
  const backendLessons = Array.isArray(detail?.lessons) ? detail.lessons : [];
  const total = moocs.length || backendLessons.length;
  const completed = backendLessons.filter((lesson) => lesson.status === "completed" || Number(lesson.progress_percent || 0) >= 100).length;
  const percent = detail?.progress ? Number(detail.progress.progress_percent || 0) : total ? Math.round((completed / total) * 100) : 0;
  const nextLesson = backendLessons.find((lesson) => lesson.status !== "completed" && Number(lesson.progress_percent || 0) < 100);
  return { total, completed, percent: Math.max(0, Math.min(100, Math.round(percent))), nextLesson };
}

function Metric({ label, value }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-black text-slate-900">{value}</div>
    </div>
  );
}

export default function LearningDashboard({
  currentUser,
  accessToken,
  progress,
  courseProgressByCourseId = {},
  topics = [],
  moocsByTopic = {},
  openTopic,
  catalogError,
  onLogout,
  onUserUpdate,
  onOpenProfilePage,
  onRefreshCatalog,
  catalogLoading = false,
  catalogSource = "api",
  quizHistory = [],
  practiceSessions = [],
}) {
  const overview = useMemo(() => computeHomeOverview({
    topics,
    moocsByTopic,
    courseProgressByCourseId,
    quizHistory,
    practiceSessions,
  }), [courseProgressByCourseId, moocsByTopic, practiceSessions, quizHistory, topics]);

  const displayName = currentUser?.full_name || currentUser?.name || currentUser?.email || "Học viên";

  return (
    <main className="mx-auto w-full max-w-[1600px] px-5 py-8 md:px-8 md:py-10">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-700 ring-1 ring-blue-100">
                  Học tập
                </div>
                <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-slate-900 md:text-6xl">Lộ trình của {displayName}</h1>
                <p className="mt-4 max-w-3xl text-base font-semibold leading-8 text-slate-600">
                  Chọn course để vào danh sách MOOC. Tiến độ từng lesson được đồng bộ theo tài khoản hiện tại.
                </p>
              </div>
              <button
                type="button"
                onClick={onRefreshCatalog}
                disabled={catalogLoading}              >
              </button>
            </div>

            {catalogError && <div className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{catalogError}</div>}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Course" value={topics.length} />
              <Metric label="Lesson" value={overview.totalLessons} />
              <Metric label="Hoàn thành" value={`${overview.completionPercent}%`} />
              <Metric label="Streak" value={`${overview.streakDays} ngày`} />
            </div>
          </div>

          {overview.continueItem && (
            <div className="rounded-[2rem] border border-blue-100 bg-blue-50 p-6 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Tiếp tục quá trình</div>
              <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{overview.continueItem.lessonTitle}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{overview.continueItem.topicTitle} - {overview.continueItem.progressPercent}%</p>
                </div>
                <button
                  type="button"
                  onClick={() => openTopic?.(overview.continueItem.topicId)}
                  className="min-h-12 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700"
                >
                  Mở course
                </button>
              </div>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${overview.continueItem.progressPercent}%` }} />
              </div>
            </div>
          )}

          <section>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="mt-2 text-3xl font-black text-slate-900">Danh sách course</h2>
              </div>
            </div>

            {!topics.length ? (
              <div className="mt-5 rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
                Chưa có course nào từ API.
              </div>
            ) : (
              <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {topics.map((topic, index) => {
                  const topicProgress = getTopicProgress(topic, moocsByTopic, courseProgressByCourseId);
                  const topicMoocs = moocsByTopic[topic.id] || [];
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => openTopic(topic.id)}
                      className="group rounded-[1.75rem] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-400 text-sm font-black text-slate-900">{index + 1}</div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-600">{topic.level}</span>
                      </div>
                      <h3 className="mt-5 text-2xl font-black leading-tight text-slate-900 group-hover:text-blue-700">{topic.title}</h3>
                      <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{topic.desc || "Course chưa có mô tả."}</p>
                      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${topicProgress.percent}%` }} />
                      </div>
                      <div className="mt-4 grid gap-2 text-xs font-black text-slate-600 sm:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 px-3 py-2">{topicMoocs.length} MOOC</div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2">{topicProgress.completed}/{topicProgress.total || 0} xong</div>
                      </div>
                      {topicProgress.nextLesson && (
                        <div className="mt-3 rounded-2xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                          Tiếp theo: {topicProgress.nextLesson.title}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24">
          <HoSo
            mode="compact"
            currentUser={currentUser}
            accessToken={accessToken}
            progress={progress}
            courseProgressByCourseId={courseProgressByCourseId}
            topics={topics}
            moocsByTopic={moocsByTopic}
            onLogout={onLogout}
            onUserUpdate={onUserUpdate}
            onOpenProfilePage={onOpenProfilePage}
          />
        </aside>
      </section>
    </main>
  );
}
