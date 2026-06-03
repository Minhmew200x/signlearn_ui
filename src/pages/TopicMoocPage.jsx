import { AppButton } from "../components/app/AppShell.jsx";

export default function TopicMoocPage({ topic, moocs, topicProgress, courseProgress, onBack, onOpenMooc }) {
  if (!topic) return null;
  return (
    <main className="mx-auto w-full max-w-[1600px] px-5 py-10">
      <AppButton onClick={onBack} variant="ghost" className="mb-6">
        {"<-"} Quay lại danh sách chủ đề
      </AppButton>

      <section className={`rounded-[2.4rem] border border-blue-100 bg-gradient-to-br ${topic.color} p-6 shadow-sm md:min-h-[280px] md:p-10`}>
        <div className="text-6xl">{topic.icon}</div>
        <h1 className="mt-4 text-4xl font-black text-slate-900 md:text-6xl">{topic.title}</h1>
        <p className="mt-3 text-xl font-semibold leading-9 text-slate-700">{topic.desc}</p>
        <div className="mt-5 rounded-2xl bg-white/70 px-5 py-4 text-base font-black text-blue-900">
          Học lần lượt 5 MOOC. Mỗi MOOC gồm 2-3 từ. Cuối mỗi MOOC sẽ mở Camera AI để chấm điểm.
        </div>
        {courseProgress?.progress && (
          <div className="mt-4 rounded-2xl bg-white/80 px-5 py-4 text-sm font-black text-slate-700 ring-1 ring-blue-100">
            Tiến độ backend: {Math.round(Number(courseProgress.progress.progress_percent || 0))}% • Trạng thái: {courseProgress.progress.status}
          </div>
        )}
      </section>

      <section className="mt-7 rounded-[2.2rem] border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-3xl font-black text-slate-900">Danh sách MOOC</h2>
        <p className="mt-2 text-lg font-semibold text-slate-600">Mỗi lần chỉ mở 1 MOOC theo thứ tự. Chấm AI xong MOOC trước mới mở được MOOC sau.</p>

        {!moocs.length ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-lg font-semibold text-slate-500">
            Chủ đề này chưa có lesson từ backend.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {moocs.map((mooc, index) => {
              const backendLessonProgress = courseProgress?.lessons?.find((lesson) => Number(lesson.lesson_id) === Number(mooc.lessonId));
              const isUnlocked = index + 1 <= Number(topicProgress?.unlockedMooc || 1);
              const score = Number(topicProgress?.bestScores?.[index] || 0);
              const isCompleted = Boolean(topicProgress?.completedMoocs?.[index]) || score > 0 || backendLessonProgress?.status === "completed";
              return (
                <button
                  key={mooc.id}
                  onClick={() => isUnlocked && onOpenMooc(index)}
                  disabled={!isUnlocked}
                  className={`w-full rounded-3xl border p-5 text-left transition ${
                    isUnlocked
                      ? "border-blue-100 bg-blue-50 hover:-translate-y-0.5 hover:shadow-md"
                      : "cursor-not-allowed border-slate-200 bg-slate-100 opacity-80"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-black uppercase tracking-wide text-slate-500">MOOC {mooc.moocNumber}</div>
                      <div className="mt-1 text-2xl font-black text-slate-900">{mooc.lessonTitle}</div>
                      {backendLessonProgress && (
                        <div className="mt-2 text-sm font-bold text-slate-500">
                          Progress: {Math.round(Number(backendLessonProgress.progress_percent || 0))}% • {backendLessonProgress.status}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <span className="rounded-full bg-emerald-600 px-3 py-1 text-sm font-black text-white">
                          {score > 0 ? `✓ Hoàn thành (${score})` : "✓ Hoàn thành"}
                        </span>
                      ) : isUnlocked ? (
                        <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-black text-white">Đang mở</span>
                      ) : (
                        <span className="rounded-full bg-slate-400 px-3 py-1 text-sm font-black text-white">Đã khóa</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}


