# Practice Webcam API Base Alignment

## Goal

Make `practice-webcam-client.js` use the same API base URL policy as the rest of the app so upload/reference/model/config requests resolve consistently across local dev and Vercel.

## Current Root Cause

- Shared app requests use `getApiBaseUrl()` via `src/app/lib/api.js`.
- `practice-webcam-client.js` keeps its own default `apiBaseUrl: ""` and resolves requests against `window.location.origin`.
- `AIPracticePage` does not pass an `apiBaseUrl` override, so the webcam client never adopts configured `VITE_API_BASE_URL`.

## Chosen Approach

1. Import `getApiBaseUrl()` into `practice-webcam-client.js`.
2. Replace the hardcoded empty default with `getApiBaseUrl()`.
3. Keep the existing `options.apiBaseUrl` override contract intact.
4. Add a regression test that proves the webcam client source uses the shared API-base helper and no longer hardcodes the empty default.

## Why This Approach

- Small diff, low risk.
- Aligns upload/reference/model/config fetches together.
- Avoids threading a new prop through multiple React layers.
- Preserves Vercel relative `/api/...` behavior when shared runtime policy intentionally returns an empty base.

## Verification

- Run the new targeted regression test red -> green.
- Run the existing URL-resolution test to confirm shared API-base expectations still hold.