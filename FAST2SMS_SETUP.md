# Fast2SMS OTP setup

OTP-based sign-up uses **Fast2SMS** to send OTP to Indian mobile numbers.

## 1. Get API key

1. Sign up at [Fast2SMS](https://www.fast2sms.com/).
2. Go to **Dev API** → get your **API Key**.
3. For OTP, use route `otp`; the API sends "Your OTP: {code}".

## 2. Environment variable

Set one of:

- `FAST2SMS_API_KEY` – production
- `FAST2SMS_API_KEY_DEV` – development (same key is fine)

Example (`.env` or Vercel):

```env
FAST2SMS_API_KEY=your_fast2sms_api_key_here
```

## 3. Public sign-up flow (APIs)

| Step | Endpoint | Description |
|------|----------|-------------|
| 1 | `POST /api/public/auth/send-otp` | Body: `{ "phone": "9876543210" }`. Sends 6-digit OTP via Fast2SMS. Rate limit: 1 per phone per 60 seconds. |
| 2 | `POST /api/public/auth/verify-otp` | Body: `{ "phone": "9876543210", "otp": "123456" }`. Returns `signupToken` (JWT, 10 min). |
| 3 | `POST /api/public/auth/signup` | Header: `Authorization: Bearer <signupToken>`. Body: `{ "name": "John", "email": "j@example.com", "address": "..." }`. Creates/updates Customer. |

All endpoints are under `/api/public` (no staff auth). CORS is applied for allowed origins.

## 4. Response shapes

**Send OTP – success (200):**
```json
{ "success": true, "data": { "expiresIn": 600 }, "message": "OTP sent to your mobile number" }
```

**Verify OTP – success (200):**
```json
{ "success": true, "data": { "signupToken": "eyJ...", "phone": "9876543210", "expiresIn": 600 } }
```

**Signup – success (201):**
```json
{ "success": true, "data": { "customer": { "id": "...", "phone": "9876543210", "name": "John", "email": "j@example.com", "address": "...", "createdAt": "..." } }, "message": "Sign up successful" }
```

Errors use `{ "success": false, "error": "CODE", "message": "..." }` with appropriate status (400, 401, 429, 502, 503).
