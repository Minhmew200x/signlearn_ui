import React, { useEffect, useRef, useState } from "react";
import {
  buildAnalyticsQueries,
  createAnalyticsRequestGate,
  createDefaultAnalyticsRange,
  formatAnalyticsPercent,
  getCompletionRate,
  getMetricTrend,
  getRangeError,
  getVisibleAnalyticsSnapshot,
  makeLinePoints,
} from "../../app/lib/adminAnalytics.js";

function DateField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <input
        type="date"
        value={value}
        onChange={onChange}
        className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500"
      />
    </label>
  );
}

function Button({ children, secondary = false, className = "", ...props }) {
  const baseClassName = secondary
    ? "min-h-10 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    : "min-h-10 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300";

  return (
    <button
      type="button"
      {...props}
      className={[baseClassName, className].filter(Boolean).join(" ")}
    >
      {children}
    </button>
  );
}

const difficultyLabels = {
  easy: "Dễ",
  medium: "Trung bình",
  hard: "Khó",
};

function toSafeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeAnalyticsPercent(value) {
  return Math.min(Math.max(toSafeNumber(value), 0), 100);
}

function normalizeAnalyticsRecords(value) {
  return Array.isArray(value)
    ? value.filter((item) => item && typeof item === "object" && !Array.isArray(item))
    : [];
}

function getRecordText(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getRecordKey(prefix, value, index) {
  const identifier = typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
  return identifier ? `${prefix}-${identifier}` : `${prefix}-${index}`;
}

function formatAnalyticsNumber(value) {
  return toSafeNumber(value).toLocaleString("vi-VN");
}

function EmptyPanel({ children }) {
  return (
    <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm font-semibold text-slate-500">
      {children}
    </p>
  );
}

function MetricCard({ label, value, metric, percent = false, detail }) {
  const trend = metric ? getMetricTrend(metric) : null;
  const trendClassName = trend?.tone === "up"
    ? "bg-emerald-50 text-emerald-700"
    : trend?.tone === "down"
      ? "bg-rose-50 text-rose-700"
      : "bg-slate-100 text-slate-600";
  const resolvedValue = metric?.value ?? value;
  const displayValue = percent ? normalizeAnalyticsPercent(resolvedValue) : resolvedValue;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-2xl font-black tracking-tight text-slate-950">
          {percent ? formatAnalyticsPercent(displayValue) : formatAnalyticsNumber(displayValue)}
        </p>
        {trend ? <span className={`rounded-full px-2 py-1 text-xs font-black ${trendClassName}`}>{trend.label}</span> : null}
      </div>
      {detail ? <p className="mt-2 text-xs font-semibold text-slate-500">{detail}</p> : null}
    </article>
  );
}

function ProgressBar({ percent, amber = false }) {
  const safePercent = toSafeNumber(percent);

  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-label="Tiến độ trung bình"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safePercent}
      aria-valuetext={formatAnalyticsPercent(safePercent)}
    >
      <div
        className={`h-full rounded-full ${amber ? "bg-amber-400" : "bg-emerald-500"}`}
        style={{ width: `${safePercent}%` }}
      />
    </div>
  );
}

function ActivityChart({ points, isPrimary, onToggle }) {
  const series = isPrimary
    ? [
        { key: "active_learners", label: "Học viên hoạt động", color: "#059669" },
        { key: "practice_attempts", label: "Lượt luyện tập", color: "#0f766e" },
        { key: "quiz_submissions", label: "Bài kiểm tra đã nộp", color: "#f59e0b" },
      ]
    : [
        { key: "registrations", label: "Đăng ký mới", color: "#2563eb" },
        { key: "lesson_completions", label: "Bài học hoàn thành", color: "#059669" },
        { key: "course_completions", label: "Khóa học hoàn thành", color: "#f43f5e" },
      ];
  const chartWidth = 720;
  const chartHeight = 220;
  const plotLeft = 44;
  const plotWidth = chartWidth - plotLeft;
  const sharedMaximum = Math.max(
    ...series.flatMap((item) => points.map((point) => Math.max(toSafeNumber(point?.[item.key]), 0))),
    1
  );
  const startDate = getRecordText(points[0]?.date, "không xác định");
  const endDate = getRecordText(points.at(-1)?.date, "không xác định");
  const seriesSummary = series.map((item) => item.label).join(", ");

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6" aria-labelledby="activity-chart-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Hoạt động học tập</p>
          <h2 id="activity-chart-heading" className="mt-1 text-xl font-black text-slate-950">Xu hướng theo ngày</h2>
        </div>
        <div className="inline-flex rounded-xl bg-slate-100 p-1" aria-label="Chọn nhóm dữ liệu biểu đồ">
          <button
            type="button"
            onClick={() => onToggle(true)}
            aria-pressed={isPrimary}
            className={`rounded-lg px-3 py-2 text-xs font-black transition ${isPrimary ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            Hoạt động
          </button>
          <button
            type="button"
            onClick={() => onToggle(false)}
            aria-pressed={!isPrimary}
            className={`rounded-lg px-3 py-2 text-xs font-black transition ${!isPrimary ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            Hoàn thành
          </button>
        </div>
      </div>

      {points.length === 0 ? (
        <div className="mt-5"><EmptyPanel>Chưa có dữ liệu hoạt động trong khoảng thời gian này.</EmptyPanel></div>
      ) : (
        <>
          <p id="activity-chart-summary" className="sr-only">
            Biểu đồ đang hiển thị {seriesSummary} từ {startDate} đến {endDate}. Giá trị tối đa trên trục dọc là {formatAnalyticsNumber(sharedMaximum)}.
          </p>
          <table id="activity-chart-data" className="sr-only">
            <caption id="activity-chart-data-caption">Dữ liệu biểu đồ theo ngày: {seriesSummary}</caption>
            <thead>
              <tr>
                <th scope="col">Ngày</th>
                {series.map((item) => <th key={item.key} scope="col">{item.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {points.map((point, index) => (
                <tr key={getRecordKey("activity-point", point.date, index)}>
                  <th scope="row">{getRecordText(point.date, "Không xác định")}</th>
                  {series.map((item) => <td key={item.key}>{formatAnalyticsNumber(Math.max(toSafeNumber(point?.[item.key]), 0))}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
            {series.map((item) => (
              <span key={item.key} className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
          <div className="mt-4 overflow-x-auto">
            <svg
              className="min-w-[620px]"
              viewBox={`0 0 ${chartWidth} ${chartHeight + 34}`}
              role="img"
              aria-labelledby="activity-chart-title activity-chart-summary"
              aria-describedby="activity-chart-data-caption"
            >
              <title id="activity-chart-title">Biểu đồ hoạt động học tập theo ngày</title>
              {[0, 1, 2, 3].map((line) => (
                <g key={line}>
                  <line
                    x1={plotLeft}
                    x2={chartWidth}
                    y1={Math.round((chartHeight / 3) * line)}
                    y2={Math.round((chartHeight / 3) * line)}
                    stroke="#e2e8f0"
                    strokeDasharray="4 4"
                  />
                  <text
                    x="0"
                    y={Math.round((chartHeight / 3) * line) + (line === 0 ? 10 : -4)}
                    fill="#64748b"
                    fontSize="12"
                  >
                    {formatAnalyticsNumber(sharedMaximum * (1 - (line / 3)))}
                  </text>
                </g>
              ))}
              <g transform={`translate(${plotLeft} 0)`}>
                {series.map((item) => (
                  <polyline
                    key={item.key}
                    fill="none"
                    stroke={item.color}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={makeLinePoints(points, item.key, plotWidth, chartHeight, sharedMaximum)}
                  />
                ))}
              </g>
              <text x={plotLeft} y={chartHeight + 26} fill="#64748b" fontSize="12">{startDate}</text>
              <text x={chartWidth} y={chartHeight + 26} fill="#64748b" fontSize="12" textAnchor="end">{endDate}</text>
            </svg>
          </div>
        </>
      )}
    </section>
  );
}

function BreakdownBars({ items, type }) {
  const records = normalizeAnalyticsRecords(items);
  if (records.length === 0) {
    return <EmptyPanel>{type === "status" ? "Chưa có trạng thái luyện tập để hiển thị." : "Chưa có dữ liệu độ khó ký hiệu."}</EmptyPanel>;
  }

  const total = Math.max(records.reduce((sum, item) => sum + Math.max(toSafeNumber(item.value), 0), 0), 1);
  const isStatus = type === "status";

  return (
    <div className="space-y-3">
      {records.map((item, index) => {
        const backendLabel = getRecordText(item.label, "Không xác định");
        const label = isStatus ? backendLabel : (difficultyLabels[backendLabel] ?? backendLabel);
        const value = Math.max(toSafeNumber(item.value), 0);
        const percent = normalizeAnalyticsPercent((value / total) * 100);
        return (
          <div key={getRecordKey(type, item.label, index)}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm font-bold text-slate-700">
              <span>{label}</span>
              <span>{formatAnalyticsNumber(value)}</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label={label}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={value}
              aria-valuetext={`${formatAnalyticsNumber(value)} trên ${formatAnalyticsNumber(total)} (${formatAnalyticsPercent(percent)})`}
            >
              <div className={`h-full rounded-full ${isStatus ? "bg-emerald-500" : "bg-amber-400"}`} style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LearningPerformanceList({ items, type }) {
  const records = normalizeAnalyticsRecords(items);
  const isCourse = type === "course";
  const noun = isCourse ? "khóa học" : "bài học";
  const titleFallback = isCourse ? "Khóa học chưa đặt tên" : "Bài học chưa đặt tên";

  if (records.length === 0) {
    return <EmptyPanel>Chưa có dữ liệu {noun} trong khoảng thời gian này.</EmptyPanel>;
  }

  return (
    <div className="space-y-3">
      {records.map((item, index) => {
        const progressPercent = normalizeAnalyticsPercent(item.average_progress_percent);
        const identifier = isCourse ? item.course_id : item.lesson_id;
        return (
          <article key={getRecordKey(type, identifier, index)} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-black text-slate-900">{getRecordText(item.title, titleFallback)}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {formatAnalyticsNumber(item.active_learners)} học viên hoạt động · {formatAnalyticsNumber(item.completed_learners)} hoàn thành
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{getRecordText(item.level, "Chưa phân loại")}</span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1"><ProgressBar percent={progressPercent} /></div>
              <span className="text-sm font-black text-emerald-700">{formatAnalyticsPercent(progressPercent)}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function AdminAnalytics({ apiRequest, accessToken }) {
  const requestGateRef = useRef(createAnalyticsRequestGate());
  const [draftRange, setDraftRange] = useState(() => createDefaultAnalyticsRange());
  const [appliedRange, setAppliedRange] = useState(() => createDefaultAnalyticsRange());
  const [snapshot, setSnapshot] = useState(null);
  const [snapshotAccessToken, setSnapshotAccessToken] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [activityGroup, setActivityGroup] = useState("primary");
  const [performanceTab, setPerformanceTab] = useState("courses");

  async function loadDashboard(range = appliedRange) {
    const requestToken = requestGateRef.current.begin();
    const rangeError = getRangeError(range);
    if (rangeError) {
      setError(rangeError);
      setStatus("error");
      return;
    }

    const queries = buildAnalyticsQueries(range);
    setStatus("loading");
    setError("");

    try {
      const [summary, timeseries, learning, content] = await Promise.all([
        apiRequest("/api/v1/admin/analytics/summary", { method: "GET", accessToken, query: queries.summary }),
        apiRequest("/api/v1/admin/analytics/timeseries", { method: "GET", accessToken, query: queries.timeseries }),
        apiRequest("/api/v1/admin/analytics/learning-performance", { method: "GET", accessToken, query: queries.learning }),
        apiRequest("/api/v1/admin/analytics/content-performance", { method: "GET", accessToken, query: queries.content }),
      ]);
      if (!requestGateRef.current.isCurrent(requestToken)) return;
      setSnapshot({ summary, timeseries, learning, content });
      setSnapshotAccessToken(accessToken);
      setAppliedRange({ ...range });
      setStatus("ready");
    } catch (requestError) {
      if (!requestGateRef.current.isCurrent(requestToken)) return;
      setError(requestError?.message || "Không thể tải dữ liệu phân tích.");
      setStatus("error");
    }
  }

  useEffect(() => {
    requestGateRef.current.invalidate();
    if (!accessToken) {
      setSnapshot(null);
      setSnapshotAccessToken(null);
      setError("");
      setStatus("idle");
    } else {
      setSnapshot(null);
      setSnapshotAccessToken(null);
      setError("");
      loadDashboard();
    }
    return () => {
      requestGateRef.current.invalidate();
    };
  }, [accessToken]);

  function updateDraftRange(key, value) {
    setDraftRange((current) => ({ ...current, [key]: value }));
  }

  function resetToThirtyDays() {
    setDraftRange(createDefaultAnalyticsRange());
  }

  const visibleSnapshot = getVisibleAnalyticsSnapshot(snapshot, snapshotAccessToken, accessToken);
  const isTokenTransition = Boolean(accessToken && snapshotAccessToken !== null && accessToken !== snapshotAccessToken);
  const isLoading = status === "loading" || isTokenTransition;
  const summary = visibleSnapshot?.summary ?? {};
  const inventory = summary.content ?? {};
  const timeseriesPoints = normalizeAnalyticsRecords(visibleSnapshot?.timeseries?.points);
  const courses = normalizeAnalyticsRecords(visibleSnapshot?.learning?.courses);
  const lessons = normalizeAnalyticsRecords(visibleSnapshot?.learning?.lessons);
  const quizzes = normalizeAnalyticsRecords(visibleSnapshot?.learning?.quizzes);
  const topSigns = normalizeAnalyticsRecords(visibleSnapshot?.content?.top_signs);
  const practiceStatuses = normalizeAnalyticsRecords(visibleSnapshot?.content?.practice_statuses);
  const signDifficulties = normalizeAnalyticsRecords(visibleSnapshot?.content?.sign_difficulties);

  if (!accessToken) return null;

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-4 sm:grid-cols-2">
            <DateField label="Từ ngày" value={draftRange.start_date} onChange={(event) => updateDraftRange("start_date", event.target.value)} />
            <DateField label="Đến ngày" value={draftRange.end_date} onChange={(event) => updateDraftRange("end_date", event.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button secondary onClick={resetToThirtyDays} disabled={isLoading}>30 ngày gần nhất</Button>
            <Button onClick={() => loadDashboard(draftRange)} disabled={isLoading}>Áp dụng</Button>
            <Button secondary onClick={() => loadDashboard()} disabled={isLoading}>Tải lại</Button>
          </div>
        </div>
        <p className="mt-4 text-sm font-medium text-slate-500">
          Đang xem dữ liệu từ {appliedRange.start_date} đến {appliedRange.end_date}.
        </p>
      </div>

      {isLoading && visibleSnapshot ? (
        <div role="status" aria-live="polite" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Dữ liệu gần nhất vẫn đang được hiển thị
        </div>
      ) : null}

      {!visibleSnapshot ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
          {isLoading || status === "idle" ? (
            <p role="status" aria-live="polite" className="text-sm font-semibold text-slate-600">Đang tải bảng điều khiển phân tích...</p>
          ) : (
            <>
              <p role="alert" className="text-sm font-semibold text-rose-700">{error || "Không thể tải dữ liệu phân tích."}</p>
              <Button className="mt-4" onClick={() => loadDashboard()}>Thử lại</Button>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          {status === "error" ? (
            <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              <span>{error || "Không thể cập nhật dữ liệu phân tích."}</span>
              <Button secondary onClick={() => loadDashboard()}>Thử lại</Button>
            </div>
          ) : null}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Tổng quan</p>
              <h2 className="text-2xl font-black text-slate-950">Hiệu quả học tập trong kỳ</h2>
            </div>
            <p className="text-sm font-semibold text-slate-500">So sánh với kỳ liền trước</p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Tổng học viên" value={summary.total_students} />
            <MetricCard label="Học viên mới" metric={summary.new_students} />
            <MetricCard label="Học viên hoạt động" metric={summary.active_learners} />
            <MetricCard label="Lượt luyện tập" metric={summary.practice_attempts} />
            <MetricCard label="Bài kiểm tra đã nộp" metric={summary.quiz_submissions} />
            <MetricCard
              label="Bài học hoàn thành"
              metric={summary.lesson_completions}
              detail={`Tỷ lệ hoàn thành ${formatAnalyticsPercent(normalizeAnalyticsPercent(summary.completion_rates?.lesson_completion_rate))}`}
            />
            <MetricCard
              label="Khóa học hoàn thành"
              metric={summary.course_completions}
              detail={`Tỷ lệ hoàn thành ${formatAnalyticsPercent(normalizeAnalyticsPercent(summary.completion_rates?.course_completion_rate))}`}
            />
            <MetricCard label="Điểm luyện tập" metric={summary.average_practice_score} percent />
            <MetricCard label="Điểm kiểm tra" metric={summary.average_quiz_score} percent />
            <MetricCard label="Tỷ lệ qua kiểm tra" metric={summary.quiz_pass_rate} percent />
          </div>

          <section className="mt-6 rounded-2xl bg-slate-950 p-4 text-white" aria-labelledby="inventory-heading">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="inventory-heading" className="font-black">Kho nội dung đang xuất bản</h3>
              <span className="text-xs font-bold text-slate-300">Theo trạng thái hiện tại</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-300">Khóa học</p>
                <p className="mt-1 text-2xl font-black">{formatAnalyticsNumber(inventory.published_courses)}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-300">Bài học</p>
                <p className="mt-1 text-2xl font-black">{formatAnalyticsNumber(inventory.published_lessons)}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-300">Ký hiệu hoạt động</p>
                <p className="mt-1 text-2xl font-black">{formatAnalyticsNumber(inventory.active_signs)}</p>
              </div>
            </div>
          </section>

          <div className="mt-6">
            <ActivityChart
              points={timeseriesPoints}
              isPrimary={activityGroup === "primary"}
              onToggle={(isPrimary) => setActivityGroup(isPrimary ? "primary" : "completion")}
            />
          </div>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6" aria-labelledby="performance-heading">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Hiệu quả chi tiết</p>
                <h2 id="performance-heading" className="mt-1 text-xl font-black text-slate-950">Nội dung học tập</h2>
              </div>
              <div className="inline-flex rounded-xl bg-slate-100 p-1" aria-label="Loại nội dung học tập">
                {[
                  ["courses", "Khóa học"],
                  ["lessons", "Bài học"],
                  ["quizzes", "Kiểm tra"],
                ].map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    aria-pressed={performanceTab === tab}
                    onClick={() => setPerformanceTab(tab)}
                    className={`rounded-lg px-3 py-2 text-xs font-black transition ${performanceTab === tab ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              {performanceTab === "courses" ? (
                <LearningPerformanceList items={courses} type="course" />
              ) : null}

              {performanceTab === "lessons" ? (
                <LearningPerformanceList items={lessons} type="lesson" />
              ) : null}

              {performanceTab === "quizzes" ? (
                quizzes.length === 0 ? <EmptyPanel>Chưa có dữ liệu kiểm tra trong khoảng thời gian này.</EmptyPanel> : (
                  <div className="space-y-3">
                    {quizzes.map((item, index) => {
                      const averageScore = normalizeAnalyticsPercent(item.average_score);
                      const passRate = normalizeAnalyticsPercent(item.pass_rate);
                      const isAmber = passRate < 70 || averageScore < 70;
                      return (
                        <article key={getRecordKey("quiz", item.quiz_id, index)} className="rounded-2xl border border-slate-200 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="font-black text-slate-900">{getRecordText(item.title, "Bài kiểm tra chưa đặt tên")}</h3>
                            <span className={`rounded-full px-2 py-1 text-xs font-black ${isAmber ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
                              {isAmber ? "Cần theo dõi" : "Ổn định"}
                            </span>
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Lượt làm</p><p className="mt-1 text-lg font-black text-slate-900">{formatAnalyticsNumber(item.attempts)}</p></div>
                            <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Điểm trung bình</p><p className={`mt-1 text-lg font-black ${averageScore < 70 ? "text-amber-700" : "text-slate-900"}`}>{formatAnalyticsPercent(averageScore)}</p></div>
                            <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Tỷ lệ đạt</p><p className={`mt-1 text-lg font-black ${passRate < 70 ? "text-amber-700" : "text-emerald-700"}`}>{formatAnalyticsPercent(passRate)}</p></div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )
              ) : null}
            </div>
          </section>

          <section className="mt-6 grid gap-5 xl:grid-cols-[1.45fr_1fr]" aria-labelledby="content-performance-heading">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Hiệu quả nội dung</p>
              <h2 id="content-performance-heading" className="mt-1 text-xl font-black text-slate-950">Ký hiệu được luyện nhiều</h2>
              {topSigns.length === 0 ? (
                <div className="mt-5"><EmptyPanel>Chưa có lượt luyện ký hiệu trong khoảng thời gian này.</EmptyPanel></div>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-[640px] w-full text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs font-black uppercase tracking-[0.1em] text-slate-500">
                      <tr>
                        <th className="px-2 py-3">Ký hiệu</th>
                        <th className="px-2 py-3 text-right">Lượt luyện</th>
                        <th className="px-2 py-3 text-right">Học viên</th>
                        <th className="px-2 py-3 text-right">Điểm TB</th>
                        <th className="px-2 py-3 text-right">Hoàn tất</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topSigns.map((item, index) => {
                        const completionRate = getCompletionRate(item);
                        const averageScore = normalizeAnalyticsPercent(item.average_score);
                        const difficulty = getRecordText(item.difficulty, "Chưa phân loại");
                        return (
                          <tr key={getRecordKey("sign", item.sign_id, index)} className="border-b border-slate-100 last:border-0">
                            <td className="px-2 py-3"><p className="font-black text-slate-900">{getRecordText(item.title, "Ký hiệu chưa đặt tên")}</p><p className="text-xs font-semibold text-slate-500">{difficultyLabels[difficulty] ?? difficulty}</p></td>
                            <td className="px-2 py-3 text-right font-bold text-slate-700">{formatAnalyticsNumber(item.attempts)}</td>
                            <td className="px-2 py-3 text-right font-bold text-slate-700">{formatAnalyticsNumber(item.unique_learners)}</td>
                            <td className="px-2 py-3 text-right font-black text-slate-900">{formatAnalyticsPercent(averageScore)}</td>
                            <td className="px-2 py-3 text-right font-black text-emerald-700">{completionRate === null ? "-" : formatAnalyticsPercent(normalizeAnalyticsPercent(completionRate))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-5">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="practice-status-heading">
                <h2 id="practice-status-heading" className="text-lg font-black text-slate-950">Trạng thái luyện tập</h2>
                <div className="mt-4"><BreakdownBars items={practiceStatuses} type="status" /></div>
              </section>
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="difficulty-heading">
                <h2 id="difficulty-heading" className="text-lg font-black text-slate-950">Độ khó ký hiệu</h2>
                <div className="mt-4"><BreakdownBars items={signDifficulties} type="difficulty" /></div>
              </section>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
