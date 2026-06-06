# AI Practice UI Config Upload Design

## Goal

Rut gon man hinh webcam AI cho user chi con video preview, trang thai, ket qua cuoi dang chu, va loi khuyen dua tren threshold config cua tung `signSlug`. Bo sung admin AI tab de load/sua scoring config theo `signSlug`. Khi ket thuc du doan, frontend van phai upload video user len `POST /api/v1/practice/uploads`; chi can upload thanh cong, khong can dung response de map vao `practice attempt`.

## Constraints

- Diff phai nho, uu tien tan dung worker/client flow hien co.
- Khong doi backend contract. Nguon su that la `openapi.json` trong repo.
- `practice attempt` van duoc tao ngay ca khi upload endpoint khong tra `asset_id`.
- Upload artifacts co muc dich luu video/keypoints len backend; khong dua vao response de dien `submitted_video_asset_id` hay `extracted_keypoint_asset_id`.

## Current Gaps

- User AI page dang hien reference video, reference metadata, metric rows, score bars, va nhieu thong so chi tiet khong can cho end user.
- User AI page dang doc `uploadResponse` nhung chua co quy uoc ro rang rang response nay khong anh huong toi `practice attempt`.
- Admin AI tab moi chi doc `ai/model` va `ai/labels`, chua co form thao tac voi `GET/PATCH /api/v1/ai/signs/{sign_slug}/config`.

## Approach

### User AI practice page

- Giu layout chinh gom:
  - target dang chon trong lesson
  - video webcam preview cua user
  - nut bat/tat camera va cham diem
  - status/countdown/processing states
  - ket qua cuoi dang chu
- Xoa khoi UI:
  - toan bo section `Reference`
  - reference video
  - reference metadata (`reference_video`, `version`, `algorithm`, `model asset`)
  - metric rows (`dtw_score`, `hand_score`, `pose_score`, `motion_score`, `trackingRatio`)
  - score bars va frame/tracking chi tiet
- Them lop summary text cho ket qua:
  - render verdict label
  - render `finalScore`
  - render 1 doan advice dua tren `excellentThreshold`, `goodThreshold`, `passThreshold` cua config dang load cho sign
- Advice copy duoc sinh bang helper thuan trong `src/app/lib` de de test va de UI user chi consume output text.

### Upload va luu practice attempt

- Giu worker/client upload flow sau khi `scoreOnce()` xong.
- Upload `POST /api/v1/practice/uploads` van gui video + keypoints nhu hien tai.
- Neu upload thanh cong:
  - coi nhu da dat muc tieu luu video user len backend
  - khong can doc/luu `uploadResponse` vao `practice attempt`
- Neu upload that bai:
  - hien canh bao ro rang la upload video that bai
  - van tiep tuc luu `practice attempt`
- `practice attempt` payload van giu:
  - `submitted_video_asset_id: null`
  - `extracted_keypoint_asset_id: null`
- Neu can trace de debug, chi them thong tin upload status/object key vao `feedback` khi co gia tri, nhung khong de contract save attempt phu thuoc vao no.

### Admin AI tab

- Giu nguyen panel AI model va AI labels hien co.
- Them panel moi `AI scoring config by sign slug`.
- Panel moi gom:
  - input `signSlug`
  - nut `Load config`
  - form edit cho `algorithm`, `handWeight`, `poseWeight`, `speedWeight`, `missingHandPenalty`, `excellentThreshold`, `goodThreshold`, `passThreshold`
  - nut `Save config`
- API calls:
  - `GET /api/v1/ai/signs/{sign_slug}/config`
  - `PATCH /api/v1/ai/signs/{sign_slug}/config`
- Sau khi save:
  - update UI bang payload moi nhat backend tra ve
  - surfacing success/error qua notice hien co cua admin dashboard

## Data Flow

1. User chon target trong lesson.
2. `createPracticeWebcamClient()` load reference/model/scoring config theo `signSlug`.
3. User quay video va worker tinh `result.finalScore` + `result.verdict`.
4. Client upload video/keypoints len `/api/v1/practice/uploads`.
5. Bat ke upload response ra sao, frontend van tao `practice attempt` qua `/api/v1/practice/attempts` voi 2 asset id bang `null`.
6. UI user chi hien final score + advice text dua tren config vua load.

## Error Handling

- Neu config GET fail tren user AI page, worker tiep tuc dung default config nhu hien tai; advice text phai dua tren config thuc te dang duoc dung.
- Neu upload fail, thong bao phai noi ro day la loi luu video, khong phai loi cham diem.
- Neu save `practice attempt` fail, thong bao phai tach biet voi upload fail.
- Admin AI panel phai validate `signSlug` khong rong truoc khi GET/PATCH.
- Admin AI panel phai parse number fields an toan, khong gui chuoi rong thanh `NaN`.

## Testing

- Update source test cho `AIPracticePage` de dam bao section reference va metric chi tiet khong con render trong source.
- Them unit test cho helper sinh advice theo threshold config.
- Them test cho practice attempt payload de xac nhan asset ids van la `null` va luu doc lap voi upload response.
- Them test cho admin AI config helpers/source de xac nhan dung path `GET/PATCH /api/v1/ai/signs/{sign_slug}/config`.
- Chay `npm test` va `npm run build` de verify.

## Files

- Modify: `src/pages/AIPracticePage.jsx`
- Modify: `src/components/auth/AdminDashboard.jsx`
- Modify: `src/app/lib/practice.js`
- Modify: `src/app/lib/api.js` (neu can helper multipart rieng; neu khong thi giu nguyen)
- Create or modify: `src/app/lib/practiceScoring.js`
- Modify: `practice-webcam-client.js`
- Modify: `tests/ai-practice-page-source.test.mjs`
- Modify: `tests/practice-ai-contract.test.mjs`
- Create: test cho admin AI config flow neu can tach rieng

## Out of Scope

- Backend changes de tra `asset_id` tu `/api/v1/practice/uploads`.
- Thay doi scoring algorithm trong worker.
- Thiet ke lai toan bo admin dashboard hoac lesson practice flow.
