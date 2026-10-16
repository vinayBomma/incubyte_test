# Deployment

| Part | Host | Config |
|---|---|---|
| Backend (Express + SQLite) | Render, free web service | [`render.yaml`](../render.yaml) |
| Frontend (static Vite build) | Vercel, Hobby | [`frontend/vercel.json`](../frontend/vercel.json) + `VITE_API_BASE_URL` |

The repo is one npm workspace (`shared`, `backend`, `frontend`). Both hosts install from the **repo root** so `@acme/shared` resolves. The two run on different origins, so the backend allows the frontend's origin via `CORS_ORIGINS`.

## Configuration

| Variable | Where | Example | Notes |
|---|---|---|---|
| `CORS_ORIGINS` | Render | `https://<your-project>.vercel.app` | Comma-separated exact origins. A trailing `/` is ignored. Empty means no cross-origin access. |
| `DATABASE_URL` | Render (optional) | `salary.db` | SQLite file path, relative to `backend/`. The default is shown. |
| `PORT` | Render (set automatically) | `10000` | Defaults to `8000` locally. |
| `NODE_VERSION` | Render | `22.17.0` | Set in `render.yaml`. |
| `VITE_API_BASE_URL` | Vercel | `https://<your-service>.onrender.com` | Backend origin without `/api`. **Baked in at build time**, so redeploy after changing it. |

## Steps

### 0. Push to GitHub

Render and Vercel both deploy from a Git repository.

```bash
git remote add origin <your-repo-url>
git push -u origin main
```

### 1. Backend on Render

1. In the Render Dashboard: **New → Blueprint** → connect GitHub → select this repository. Render reads `render.yaml` from the repo root.
2. Render prompts for `CORS_ORIGINS`. You don't know the Vercel URL yet, so leave it empty for now.
3. Click **Deploy Blueprint**. The build runs `npm ci` at the root; the start command is `npm start -w backend` (`tsx src/server.ts`, see ADR-9). On first start the logs should show `Seeded 10,000 employees into an empty database`, then `API listening on port …`.
4. Copy the service URL from the service page (`https://<your-service>.onrender.com`) and check it:
   - `https://<your-service>.onrender.com/api/health` returns `{"status":"ok"}`.
   - `https://<your-service>.onrender.com/api/insights/summary` shows `"headcount":10000`.

### 2. Frontend on Vercel

1. In the Vercel Dashboard: **Add New… → Project** → import the same repository.
2. Set **Root Directory** to `frontend`. `frontend/vercel.json` sets the rest: install with `cd .. && npm ci` (the workspace root), build with `npm run build`, output `dist`.
3. Under **Environment Variables**, add `VITE_API_BASE_URL` = the Render URL from step 1.4, with no trailing `/api`.
4. Click **Deploy** and copy the production URL (`https://<your-project>.vercel.app`).

### 3. Connect them (CORS)

1. In Render, open the service → **Environment** → set `CORS_ORIGINS` to the Vercel production URL from step 2.4 → **Save, rebuild, and deploy**.
2. Open the Vercel URL. The Employees list and Insights should load. If you see the error state, check the browser console:
   - A **CORS error** means `CORS_ORIGINS` doesn't exactly match the page origin, including `https://`.
   - A **404 or HTML response** means `VITE_API_BASE_URL` is wrong. Fix it and **redeploy** on Vercel; a variable change alone doesn't rebuild.

Vercel *preview* deployments get their own URLs. They're blocked by CORS unless you add them to `CORS_ORIGINS`.

### 4. Current deployment

- App: https://incubyte-test.vercel.app/
- API: https://acme-salary-api-82ci.onrender.com (`CORS_ORIGINS=https://incubyte-test.vercel.app`)

Smoke-tested live: `/api/health` returns `{"status":"ok"}`, `/api/insights/summary` returns `"headcount":10000`, the API echoes the Vercel origin in `Access-Control-Allow-Origin`, and the app lists 10,000 employees.

## Verified before deploying

A fresh `git clone` into an empty folder, then `npm ci`, `npm test`, `npm run build -w frontend` and `PORT=… CORS_ORIGINS=… npm start -w backend`. Results: it seeded 10,000 rows, `/api/health` was OK, the allowed origin was echoed in `Access-Control-Allow-Origin`, and an unknown origin got no CORS header. This run caught that `better-sqlite3@13` compiles from source on a clean install (no install script, so npm falls back to `node-gyp`). The repo pins `12.11.1`, which downloads a prebuilt binary.

## Free-tier limitations (accepted for a demo)

The choice is recorded in [decisions.md](decisions.md) (ADR-10).

- **Data is not durable.** The free Render instance has an ephemeral filesystem. The SQLite file is lost on every redeploy, restart, or spin-down, and the app reseeds the same deterministic 10,000 employees on the next start. HR edits made in the demo don't survive this.
- **Cold starts.** After 15 minutes without traffic the service spins down. The next request takes about a minute while it boots and reseeds (reseeding takes under 1 s; the rest is Render's boot). Open the backend `/api/health` URL before a demo.
- **Single instance.** SQLite is a local file, so the service must not be scaled beyond one instance.

**Upgrade path:** move to a managed Postgres (for example Neon's free tier) for durability. That needs:
- Drizzle's `pg-core` schema and the `node-postgres` driver in place of `better-sqlite3`.
- `bigint` for `salary` (high-value minor units can exceed 32-bit).
- `Number()` on Postgres `AVG` results, which come back as `numeric` strings.
- A CI job running the suite against Postgres.
