# Why localhost is slower than the deployed server

When you run the app **locally** (localhost), API calls often feel slower than on **Vercel** (or another hosted server). Here’s why and what you can do.

## Why localhost is slower

1. **Database is remote (e.g. Neon)**  
   - **Local:** Your machine → Internet → Neon (e.g. `us-east-1`) → back. Every request has high round-trip latency.  
   - **Vercel:** Vercel and Neon in the same region (e.g. `us-east-1`) → low latency between app and DB.  
   So the same DB is “far” from your laptop but “close” to the server.

2. **No edge caching**  
   Deployed app may use CDN/caching; locally there’s no such layer.

3. **Dev mode overhead**  
   Next.js in `npm run dev` does more work (HMR, source maps, etc.), so each request can be slower.

## What you can do

### 1. Use the pooled connection string (Neon)

In `.env`, use the **pooler** URL from Neon (Dashboard → Connection details):

- Host should look like: `ep-xxx-pooler.xxx.neon.tech` (with `-pooler`).
- Add a short timeout so bad connections fail fast:

```env
# Example – add connect_timeout for local dev
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=10"
```

Use the same `DIRECT_URL` (non-pooler) for migrations as you do on the server.

### 2. Run the database locally (fastest for dev)

For the snappiest local experience, run Postgres on your machine and point local env to it:

- **Docker:**  
  `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15`
- In `.env.local`:  
  `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hotel_db?schema=public"`  
  Then: `npx prisma migrate deploy` (or `db push`).

Then your app talks to the DB on localhost and avoids internet latency.

### 3. Keep using the deployed app for “production-like” speed

Use the hosted app (e.g. Vercel) when you want to test real-world speed; use localhost mainly for code changes and debugging.

### 4. Reduce number of API calls (optional)

- Use React Query `staleTime` so some data is cached and not refetched on every navigation.
- Combine or batch API calls where it makes sense.

---

**Summary:** Localhost is slower mainly because your machine is far from the remote DB; the server is in the same region as the DB. Use the pooler URL and/or a local Postgres for better local performance.
