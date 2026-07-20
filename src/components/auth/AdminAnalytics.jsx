import React, { useEffect, useRef, useState } from "react";
import {
  buildAnalyticsQueries,
  createDefaultAnalyticsRange,
  getRangeError,
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

function Button({ children, secondary = false, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={secondary
        ? "min-h-10 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        : "min-h-10 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"}
    >
      {children}
    </button>
  );
}

export function AdminAnalytics({ apiRequest, accessToken }) {
  const requestVersionRef = useRef(0);
  const [draftRange, setDraftRange] = useState(() => createDefaultAnalyticsRange());
  const [appliedRange, setAppliedRange] = useState(() => createDefaultAnalyticsRange());
  const [snapshot, setSnapshot] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function loadDashboard(range = appliedRange) {
    const requestVersion = ++requestVersionRef.current;
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
      if (requestVersion !== requestVersionRef.current) return;
      setSnapshot({ summary, timeseries, learning, content });
      setAppliedRange({ ...range });
      setStatus("ready");
    } catch (requestError) {
      if (requestVersion !== requestVersionRef.current) return;
      setError(requestError?.message || "Không thể tải dữ liệu phân tích.");
      setStatus("error");
    }
  }

  useEffect(() => {
    if (!accessToken) return;
    loadDashboard();
    return () => {
      requestVersionRef.current += 1;
    };
  }, [accessToken]);

  function updateDraftRange(key, value) {
    setDraftRange((current) => ({ ...current, [key]: value }));
  }

  function resetToThirtyDays() {
    setDraftRange(createDefaultAnalyticsRange());
  }

  const isLoading = status === "loading";

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

      {isLoading && snapshot ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Dữ liệu gần nhất vẫn đang được hiển thị
        </div>
      ) : null}

      {!snapshot ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
          {isLoading || status === "idle" ? (
            <p className="text-sm font-semibold text-slate-600">Đang tải bảng điều khiển phân tích...</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-rose-700">{error || "Không thể tải dữ liệu phân tích."}</p>
              <Button className="mt-4" onClick={() => loadDashboard()}>Thử lại</Button>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          {status === "error" ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              <span>{error || "Không thể cập nhật dữ liệu phân tích."}</span>
              <Button secondary onClick={() => loadDashboard()}>Thử lại</Button>
            </div>
          ) : null}
          <h2 className="text-lg font-black text-slate-900">Dữ liệu phân tích đã sẵn sàng</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">Các chỉ số và bảng chi tiết sẽ được hiển thị tại đây.</p>
        </div>
      )}
    </section>
  );
}
