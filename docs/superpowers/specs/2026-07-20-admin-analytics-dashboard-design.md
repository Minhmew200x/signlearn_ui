# Admin analytics dashboard design

## Goal

Give an authenticated administrator a useful analytics dashboard immediately on opening `/dashboard`. The implementation consumes only the four read-only analytics endpoints described in `admin-analytics-ui.md` and does not infer unavailable product metrics.

## Route and navigation

The existing default admin section keeps its stable id, `tong-quan`, and therefore continues to resolve from `/dashboard`. Its visible navigation label changes from **Admin** to **Analytics** and its content changes from the legacy administrative overview to the analytics dashboard. The existing Users, Courses, Lessons, Signs & Quiz, Blog, AI, and Practice sections, their routes, and their actions remain unchanged.

This is the selected “analytics first” layout: an administrator lands on data without an extra click, while operational controls remain available in the same navigation.

## Data contract and state

The dashboard owns a date-range state. Its initial range is the 30 UTC calendar days ending today, inclusive: `end_date` is today and `start_date` is 29 days earlier. Both values use `YYYY-MM-DD` and are sent explicitly to every request. The ranking endpoints receive `limit=10`.

On the initial load and every applied date range, it makes these four GET requests concurrently with the existing authenticated `apiRequest` helper:

1. `/api/v1/admin/analytics/summary`
2. `/api/v1/admin/analytics/timeseries`
3. `/api/v1/admin/analytics/learning-performance`
4. `/api/v1/admin/analytics/content-performance`

All four requests use exactly the same `start_date` and `end_date`. A complete set replaces the current dashboard snapshot. During refresh, an existing successful snapshot stays visible with a loading indicator. If any request fails, the prior successful snapshot remains visible together with an error and a retry action; before the first successful response, the dashboard shows an explicit error state. Empty arrays and zero-valued KPIs are normal successful states, not errors.

The UI blocks invalid local ranges (`start_date > end_date` or more than 366 inclusive days) and displays the backend response message for server-side validation failures. Authentication and authorization failures continue through the existing API error handling.

## Dashboard layout

The page header contains the title, UTC date inputs, a 30-day reset control, an Apply action, and a Reload action. It shows the applied period after a successful load.

The body is arranged in this order:

1. KPI cards for total students, new students, active learners, practice attempts, quiz submissions, lesson and course completions, practice and quiz scores, quiz pass rate, and the published-content inventory. A metric with `change_percent: null` displays “Mới” rather than calculating a delta. Scores and rates always use a `%` suffix.
2. A primary activity chart for active learners, practice attempts, and quiz submissions. A compact selector exposes registrations, lesson completions, and course completions. It consumes the server's chronological, zero-filled points directly.
3. Learning-performance tabs for Courses, Lessons, and Quizzes. Course and lesson rows show active learners, completions, and a progress bar; quiz rows show attempts, average score, and pass rate, with warning treatment for weaker results.
4. Content performance: a ranked sign table with attempts, unique learners, average score, and a locally derived completion rate; status and difficulty distribution cards retain backend status labels and translate only the difficulty labels for display.

Charts use lightweight inline SVG/CSS components rather than a new chart dependency. Tables and chart controls are responsive: primary data remains readable and horizontally scrollable where a narrow screen cannot fit all columns.

## Module boundaries

`src/app/lib/adminAnalytics.js` contains pure date/query validation, KPI formatting, derived completion-rate, and chart-series normalization helpers. `AdminDashboard.jsx` owns request lifecycle, date-control state, selected views, and rendering. The component does not embed query calculation or percentage edge-case logic.

## Tests and acceptance criteria

Focused Node tests cover the analytics helper behavior: inclusive 30-day UTC default range, valid query construction, invalid-range rejection, delta semantics including `null`, percentage formatting, derived completion rates without division by zero, and the chronological activity-series shape. A source-level contract test verifies that the dashboard references all four analytics endpoints and sends the shared date query plus ranking limit.

The finished dashboard is accepted when an admin opening `/dashboard` sees Analytics, each range application calls the four documented endpoints in parallel, the documented response shapes render without a runtime error, zero/empty data is friendly, and a failed refresh retains the last successful content with a retry control.

## Scope boundaries

The dashboard deliberately excludes page views, acquisition source, session duration, funnel abandonment, revenue, and any other metric not supplied by the analytics contract. It makes no backend migrations, no write requests, and introduces no dependency.
