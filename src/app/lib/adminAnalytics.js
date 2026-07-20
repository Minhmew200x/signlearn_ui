const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;

export function createAnalyticsRequestGate() {
  let currentVersion = 0;

  return {
    begin() {
      currentVersion += 1;
      return currentVersion;
    },
    invalidate() {
      currentVersion += 1;
    },
    isCurrent(version) {
      return version === currentVersion;
    },
  };
}

export function getVisibleAnalyticsSnapshot(snapshot, snapshotAccessToken, accessToken) {
  return accessToken && snapshotAccessToken === accessToken ? snapshot : null;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function toDateKey(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function parseDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

export function createDefaultAnalyticsRange(referenceDate = new Date()) {
  const end = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));
  const start = new Date(end.getTime() - 29 * DAY_MS);
  return { start_date: toDateKey(start), end_date: toDateKey(end) };
}

export function getRangeError(range) {
  const start = parseDateKey(range?.start_date);
  const end = parseDateKey(range?.end_date);
  if (!start || !end) return "Chọn ngày bắt đầu và ngày kết thúc hợp lệ.";
  if (start > end) return "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.";
  if (((end - start) / DAY_MS) + 1 > MAX_RANGE_DAYS) return "Khoảng ngày tối đa là 366 ngày.";
  return "";
}

export function buildAnalyticsQueries(range, limit = 10) {
  const error = getRangeError(range);
  if (error) throw new Error(error);
  const dates = { start_date: range.start_date, end_date: range.end_date };
  return { summary: dates, timeseries: dates, learning: { ...dates, limit }, content: { ...dates, limit } };
}

export function formatAnalyticsPercent(value, maximumFractionDigits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${number.toLocaleString("vi-VN", { maximumFractionDigits })}%`;
}

export function getMetricTrend(metric) {
  const change = Number(metric?.change_percent);
  if (metric?.change_percent === null) return { label: "Mới", tone: "new" };
  if (!Number.isFinite(change) || change === 0) return { label: "Không đổi", tone: "neutral" };
  return { label: `${change > 0 ? "↑" : "↓"} ${formatAnalyticsPercent(Math.abs(change))}`, tone: change > 0 ? "up" : "down" };
}

export function getCompletionRate(item) {
  const attempts = Number(item?.attempts);
  const completed = Number(item?.completed_attempts);
  if (!Number.isFinite(attempts) || attempts <= 0 || !Number.isFinite(completed)) return null;
  const safeCompleted = Math.min(Math.max(completed, 0), attempts);
  return Math.round((safeCompleted / attempts) * 10000) / 100;
}

export function makeLinePoints(points, key, width, height, sharedMaximum) {
  if (!points?.length) return "";
  const values = points.map((point) => {
    const value = Number(point?.[key]);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  });
  const inferredMaximum = Math.max(...values, 1);
  const requestedMaximum = Number(sharedMaximum);
  const maximum = Number.isFinite(requestedMaximum) && requestedMaximum > 0
    ? Math.max(requestedMaximum, inferredMaximum)
    : inferredMaximum;
  const denominator = Math.max(points.length - 1, 1);
  return values.map((value, index) => `${Math.round((index / denominator) * width)},${Math.round(height - ((value / maximum) * height))}`).join(" ");
}
