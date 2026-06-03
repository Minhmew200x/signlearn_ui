# Signlearn Web

Báº£n React/Vite cho Signlearn gá»“m 4 pháº§n chÃ­nh:

- Trang chá»§
- Blog cá»™ng Ä‘á»“ng
- Há»c táº­p vá»›i 10 chá»§ Ä‘á»
- Admin theo dÃµi tiáº¿n Ä‘á»™ há»c viÃªn

## Flow há»c táº­p Ä‘Ã£ chá»‰nh láº¡i

Trong pháº§n **Há»c táº­p**:  

1. Há»c viÃªn chá»n 1 trong 10 chá»§ Ä‘á».
2. Trong tá»«ng chá»§ Ä‘á», há»c viÃªn há»c theo lá»™ trÃ¬nh MOOC.
3. Má»—i MOOC hiá»ƒn thá»‹ tá»«ng bÆ°á»›c:
   - 1 tá»« vá»±ng
   - 1 video tÆ°Æ¡ng á»©ng vá»›i tá»« Ä‘Ã³
   - nÃºt **ÄÃ£ xem xong - Tiáº¿p theo** Ä‘á»ƒ chuyá»ƒn sang tá»« káº¿ tiáº¿p
4. Sau khi xem Ä‘á»§ 5 tá»« vá»±ng cá»§a MOOC, há»‡ thá»‘ng má»Ÿ pháº§n **Camera AI cháº¥m Ä‘iá»ƒm**.
5. Khi cháº¥m Ä‘iá»ƒm xong, MOOC hiá»‡n táº¡i Ä‘Æ°á»£c Ä‘Ã¡nh dáº¥u hoÃ n thÃ nh vÃ  MOOC tiáº¿p theo Ä‘Æ°á»£c má»Ÿ khÃ³a.

## Admin theo dÃµi

Tab **Admin theo dÃµi** hiá»ƒn thá»‹:

- Tá»•ng sá»‘ MOOC Ä‘Ã£ hoÃ n thÃ nh
- MOOC há»c viÃªn Ä‘ang há»c
- Äiá»ƒm AI gáº§n nháº¥t
- Tiáº¿n Ä‘á»™ theo tá»«ng chá»§ Ä‘á»
- Báº£ng chi tiáº¿t tá»«ng MOOC: sá»‘ tá»« Ä‘Ã£ xem, Ä‘iá»ƒm AI, tráº¡ng thÃ¡i khÃ³a/má»Ÿ/hoÃ n thÃ nh

Tiáº¿n Ä‘á»™ demo Ä‘ang Ä‘Æ°á»£c lÆ°u báº±ng `localStorage` cá»§a trÃ¬nh duyá»‡t.

## Cháº¡y project

```bash
npm install
npm run dev
```

Sau Ä‘Ã³ má»Ÿ Ä‘Æ°á»ng link Vite hiá»‡n ra trong terminal.

## Ghi chÃº ká»¹ thuáº­t

Pháº§n camera dÃ¹ng `navigator.mediaDevices.getUserMedia()` Ä‘á»ƒ má»Ÿ webcam tháº­t. Pháº§n Ä‘iá»ƒm AI hiá»‡n Ä‘ang mÃ´ phá»ng Ä‘á»ƒ hoÃ n thiá»‡n flow giao diá»‡n trÆ°á»›c. Khi lÃ m báº£n tháº­t cÃ³ thá»ƒ ná»‘i MediaPipe Hands hoáº·c TensorFlow.js Ä‘á»ƒ phÃ¢n tÃ­ch tay tháº­t.

Trong dá»¯ liá»‡u tá»« vá»±ng, má»—i tá»« cÃ³ trÆ°á»ng `videoUrl`. Hiá»‡n táº¡i Ä‘á»ƒ trá»‘ng nÃªn giao diá»‡n hiá»ƒn thá»‹ khung video máº«u. Khi cÃ³ video tháº­t, chá»‰ cáº§n thÃªm Ä‘Æ°á»ng dáº«n MP4 vÃ o `videoUrl` cá»§a tá»«ng tá»«.

## Google OAuth (Prepared Flow)

Frontend now includes a `Dang nhap voi Google` button in the user login screen.

To enable real Google login, configure these env vars in `.env`:

```bash
VITE_API_BASE_URL=
VITE_PROXY_TARGET=http://100.65.120.94:8000
VITE_GOOGLE_AUTH_URL=http://100.65.120.94:8000/api/v1/auth/google/start
VITE_GOOGLE_CALLBACK_EXCHANGE_URL=/api/v1/auth/google/exchange
```

`VITE_API_BASE_URL=` (empty) means frontend calls relative `/api/...` and Vite dev proxy forwards to backend, which avoids browser CORS preflight failures like `Failed to fetch`.

Expected backend behavior:

1. `VITE_GOOGLE_AUTH_URL` starts OAuth redirect to Google.
2. Callback returns either:
   - `access_token` + `refresh_token` in query params, or
   - `code` which frontend exchanges at `VITE_GOOGLE_CALLBACK_EXCHANGE_URL`.
3. Exchange endpoint should return `TokenPairResponse` compatible with `/api/v1/auth/login`.

