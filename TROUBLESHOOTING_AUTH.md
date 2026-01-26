# 🔧 Troubleshooting Authentication Issues

## Problem: "Invalid or expired token" on all API calls

### Possible Causes:

1. **jsonwebtoken not installed**
   - The JWT library might not be installed
   - Solution: `npm install jsonwebtoken @types/jsonwebtoken`

2. **JWT_SECRET not set in Vercel**
   - Environment variables missing
   - Solution: Add `JWT_SECRET` and `JWT_REFRESH_SECRET` in Vercel

3. **Token not stored after login**
   - Check browser localStorage
   - Solution: Clear localStorage and login again

4. **Token expired**
   - Access tokens expire in 15 minutes
   - Solution: Token should auto-refresh, but if refresh fails, re-login

---

## 🔍 Debugging Steps

### 1. Check if jsonwebtoken is installed
```bash
npm list jsonwebtoken
```

If not installed:
```bash
npm install jsonwebtoken @types/jsonwebtoken
```

### 2. Check Vercel Environment Variables
- Go to Vercel Dashboard → Settings → Environment Variables
- Verify `JWT_SECRET` and `JWT_REFRESH_SECRET` are set
- Make sure they're added to **Production** environment

### 3. Check Browser Console
- Open browser DevTools (F12)
- Go to Console tab
- Look for errors when making API calls
- Check Application → Local Storage for `accessToken`

### 4. Check Network Tab
- Open DevTools → Network tab
- Make an API call
- Check the request headers - should include `Authorization: Bearer <token>`
- Check response - if 401, token might be invalid

### 5. Test Login Flow
1. Clear localStorage: `localStorage.clear()`
2. Login again
3. Check if `accessToken` is stored in localStorage
4. Try making an API call

---

## 🛠️ Quick Fixes

### Fix 1: Install jsonwebtoken
```bash
npm install jsonwebtoken @types/jsonwebtoken
npm run build
```

### Fix 2: Add Environment Variables in Vercel
1. Go to Vercel Dashboard
2. Settings → Environment Variables
3. Add:
   - `JWT_SECRET` = (generate 64-char random string)
   - `JWT_REFRESH_SECRET` = (different 64-char random string)
4. Redeploy

### Fix 3: Clear and Re-login
```javascript
// In browser console:
localStorage.clear()
// Then login again
```

### Fix 4: Check Token Format
```javascript
// In browser console:
const token = localStorage.getItem('accessToken')
console.log('Token:', token)
// Should be a long JWT string starting with "eyJ..."
```

---

## 🐛 Common Issues

### Issue: "jsonwebtoken is not installed"
**Solution:**
```bash
npm install jsonwebtoken @types/jsonwebtoken
```

### Issue: "JWT_SECRET is not defined"
**Solution:**
- Add `JWT_SECRET` in Vercel environment variables
- Redeploy application

### Issue: Token exists but API calls fail
**Possible causes:**
- Token expired (15min default)
- Token signed with different secret
- Token format is wrong

**Solution:**
- Clear localStorage and login again
- Check JWT_SECRET matches in all environments

### Issue: Login works but subsequent API calls fail
**Possible causes:**
- Token not being sent in Authorization header
- Token refresh failing
- CORS issues

**Solution:**
- Check Network tab - verify `Authorization: Bearer <token>` header
- Check if refresh token cookie is set
- Verify API client is including credentials

---

## ✅ Verification Checklist

- [ ] `jsonwebtoken` package installed
- [ ] `JWT_SECRET` set in Vercel
- [ ] `JWT_REFRESH_SECRET` set in Vercel (different from JWT_SECRET)
- [ ] Application redeployed after adding env vars
- [ ] `accessToken` stored in localStorage after login
- [ ] `Authorization: Bearer <token>` header in API requests
- [ ] Refresh token cookie set (check Application → Cookies)

---

## 🔄 Fallback: Temporary Disable JWT (For Testing)

If JWT is causing issues, you can temporarily use the old auth method:

1. Comment out JWT generation in login route
2. Use simple user ID in localStorage
3. Update API routes to check user ID instead of JWT

**Note:** This is NOT recommended for production - only for debugging.

---

## 📞 Still Having Issues?

1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify environment variables are set correctly
4. Try logging in again after clearing localStorage
5. Check if database connection is working
