# Admin Analytics API — UI Handoff

Các API này chỉ dành cho tài khoản có `role = "admin"`. Tất cả đều là `GET`, chỉ đọc dữ liệu hiện có, và không yêu cầu migration.

Base URL production: `https://<api-host>/api/v1/admin/analytics`

```http
Authorization: Bearer <admin-access-token>
```

## Cách tải dashboard

Khi mở trang dashboard, gọi song song bốn API sau với cùng một khoảng ngày:

1. `GET /summary` — KPI cards và so sánh với kỳ trước.
2. `GET /timeseries` — biểu đồ hoạt động theo ngày.
3. `GET /learning-performance` — bảng/biểu đồ hiệu quả course, lesson, quiz.
4. `GET /content-performance` — bảng ký hiệu được luyện nhiều và phân bổ nội dung.

Ví dụ khoảng thời gian 30 ngày kết thúc ngày 20/07/2026:

```text
?start_date=2026-06-21&end_date=2026-07-20
```

`start_date` và `end_date` dùng định dạng `YYYY-MM-DD`, tính cả hai đầu mút, theo UTC. Nếu bỏ cả hai, API tự chọn 30 ngày lịch gần nhất. API cho phép tối đa 366 ngày; khi `start_date > end_date` hoặc vượt giới hạn, trả `422`.

Các endpoint có ranking nhận thêm `limit` từ `1` đến `50`, mặc định `10`.

## 1. KPI tổng quan

```http
GET /api/v1/admin/analytics/summary?start_date=2026-06-21&end_date=2026-07-20
```

Response:

```json
{
  "period": {
    "start_date": "2026-06-21",
    "end_date": "2026-07-20",
    "previous_start_date": "2026-05-22",
    "previous_end_date": "2026-06-20",
    "timezone": "UTC"
  },
  "total_students": 1280,
  "new_students": { "value": 84, "previous_value": 76, "change_percent": 10.53 },
  "active_learners": { "value": 320, "previous_value": 281, "change_percent": 13.88 },
  "practice_attempts": { "value": 945, "previous_value": 811, "change_percent": 16.52 },
  "quiz_submissions": { "value": 410, "previous_value": 392, "change_percent": 4.59 },
  "lesson_completions": { "value": 197, "previous_value": 175, "change_percent": 12.57 },
  "course_completions": { "value": 45, "previous_value": 38, "change_percent": 18.42 },
  "average_practice_score": { "value": 82.4, "previous_value": 80.1, "change_percent": 2.87 },
  "average_quiz_score": { "value": 78.65, "previous_value": 76.42, "change_percent": 2.92 },
  "quiz_pass_rate": { "value": 71.95, "previous_value": 69.13, "change_percent": 4.08 },
  "completion_rates": {
    "course_completion_rate": 33.4,
    "lesson_completion_rate": 48.2
  },
  "content": {
    "published_courses": 12,
    "published_lessons": 64,
    "active_signs": 315
  }
}
```

Gợi ý UI:

- Hiển thị card `total_students` không có delta.
- Dùng các object dạng `{ value, previous_value, change_percent }` cho card có mũi tên tăng/giảm. `change_percent = null` nghĩa kỳ trước bằng `0`; hiển thị `Mới` hoặc bỏ delta, không chia cho 0.
- Hai trường `*_score`, `*_rate` và `completion_rates.*` là phần trăm 0–100, nên thêm hậu tố `%`.
- `content` phù hợp cho card tồn kho nội dung.

## 2. Chuỗi thời gian hoạt động

```http
GET /api/v1/admin/analytics/timeseries?start_date=2026-06-21&end_date=2026-07-20
```

```json
{
  "period": { "start_date": "2026-06-21", "end_date": "2026-07-20", "previous_start_date": "2026-05-22", "previous_end_date": "2026-06-20", "timezone": "UTC" },
  "points": [
    {
      "date": "2026-06-21",
      "registrations": 4,
      "active_learners": 26,
      "practice_attempts": 72,
      "quiz_submissions": 31,
      "lesson_completions": 14,
      "course_completions": 3
    }
  ]
}
```

`points` luôn có một phần tử cho mỗi ngày trong khoảng đã chọn và được sắp tăng dần theo `date`. Ngày không có hoạt động có giá trị `0`, vì vậy UI có thể đưa thẳng vào line/area/bar chart, không cần tự bù ngày thiếu.

Gợi ý UI: biểu đồ chính cho `active_learners`, `practice_attempts`, `quiz_submissions`; biểu đồ phụ hoặc toggle cho `registrations`, `lesson_completions`, `course_completions`. Khi chọn khoảng hơn 60–90 ngày, UI có thể tự cộng dồn theo tuần để giảm mật độ nhãn trục X.

## 3. Hiệu quả học tập

```http
GET /api/v1/admin/analytics/learning-performance?start_date=2026-06-21&end_date=2026-07-20&limit=10
```

```json
{
  "period": { "start_date": "2026-06-21", "end_date": "2026-07-20", "previous_start_date": "2026-05-22", "previous_end_date": "2026-06-20", "timezone": "UTC" },
  "totals": {
    "quiz_submissions": 410,
    "average_quiz_score": 78.65,
    "quiz_pass_rate": 71.95,
    "practice_attempts": 945,
    "average_practice_score": 82.4,
    "lesson_completions": 197,
    "course_completions": 45
  },
  "courses": [
    {
      "course_id": 7,
      "title": "Giao tiếp cơ bản",
      "level": "beginner",
      "active_learners": 132,
      "completed_learners": 27,
      "average_progress_percent": 66.81
    }
  ],
  "lessons": [
    {
      "lesson_id": 14,
      "title": "Chào hỏi",
      "level": "beginner",
      "active_learners": 88,
      "completed_learners": 35,
      "average_progress_percent": 72.5
    }
  ],
  "quizzes": [
    {
      "quiz_id": 23,
      "title": "Kiểm tra chào hỏi",
      "attempts": 96,
      "average_score": 73.44,
      "pass_rate": 68.75
    }
  ]
}
```

Semantics để đặt nhãn chính xác:

- `courses[].active_learners` và `lessons[].active_learners`: số học viên có progress được cập nhật trong khoảng ngày.
- `completed_learners`: số completion xảy ra trong khoảng ngày, không phải completion tích lũy.
- `average_progress_percent`: trung bình progress của các học viên hoạt động trong khoảng ngày.
- `quizzes[]` chỉ tính attempt có `status = completed` và đã submit trong khoảng ngày; `pass_rate` so với `passing_score` riêng của mỗi quiz.

Gợi ý UI: ba tabs/bảng Course, Lesson, Quiz. Sắp xếp backend đã ưu tiên hoạt động nhiều nhất; dùng progress bar cho `average_progress_percent`, và tô màu warning cho `pass_rate` hoặc `average_score` thấp.

## 4. Hiệu quả nội dung ký hiệu

```http
GET /api/v1/admin/analytics/content-performance?start_date=2026-06-21&end_date=2026-07-20&limit=10
```

```json
{
  "period": { "start_date": "2026-06-21", "end_date": "2026-07-20", "previous_start_date": "2026-05-22", "previous_end_date": "2026-06-20", "timezone": "UTC" },
  "top_signs": [
    {
      "sign_id": 42,
      "slug": "xin-chao",
      "title": "Xin chào",
      "difficulty": "easy",
      "attempts": 153,
      "unique_learners": 71,
      "completed_attempts": 147,
      "average_score": 84.33
    }
  ],
  "practice_statuses": [
    { "label": "completed", "value": 913 },
    { "label": "failed", "value": 12 },
    { "label": "processing", "value": 20 }
  ],
  "sign_difficulties": [
    { "label": "easy", "value": 155 },
    { "label": "medium", "value": 110 },
    { "label": "hard", "value": 50 }
  ]
}
```

Gợi ý UI:

- `top_signs`: table xếp hạng, cột lượt luyện, học viên riêng biệt, score trung bình và tỷ lệ hoàn tất (`completed_attempts / attempts`, UI tự tính khi `attempts > 0`).
- `practice_statuses`: donut chart trạng thái pipeline AI; giữ nguyên `label` vì đây là enum backend (`processing`, `completed`, `failed`).
- `sign_difficulties`: bar/donut chart kho nội dung active, nhãn `easy`, `medium`, `hard` có thể dịch ở UI.

## Quy tắc dữ liệu và trạng thái rỗng

- Tất cả số liệu hành vi chỉ tính user có role `student`; hoạt động thử nghiệm của admin không làm lệch dashboard.
- `active_learners` lấy từ `user_daily_activities`, do đó chỉ phản ánh các hành động mà backend hiện ghi nhận là hoạt động học tập; không phải số page view.
- Score luyện tập trung bình chỉ tính attempt có `status = completed`; tổng lượt luyện vẫn gồm cả `processing` và `failed`.
- Nếu chưa có dữ liệu, KPI trả `0`, ranking trả `[]`, và chuỗi thời gian vẫn trả đủ ngày với `0`. UI nên hiển thị empty state thân thiện, không coi đây là lỗi API.
- Hiện schema chưa lưu page-view, nguồn truy cập, session duration, funnel rời trang, hoặc doanh thu. Không nên dựng các insight đó từ endpoint này vì sẽ không chính xác.

## Xử lý lỗi

- `401`: thiếu, sai, hoặc hết hạn Bearer token.
- `403`: token hợp lệ nhưng user không phải admin.
- `422`: ngày sai định dạng, `start_date` sau `end_date`, khoảng lớn hơn 366 ngày, hoặc `limit` ngoài 1–50.
- `500`: lỗi hạ tầng/backend; hiển thị retry state, giữ dữ liệu dashboard lần tải thành công trước đó nếu có.

Swagger/OpenAPI tương tác có sẵn tại `GET /docs` của backend sau khi deploy.
