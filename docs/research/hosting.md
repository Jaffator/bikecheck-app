# Hosting BikeCheck

*Research note. Pricing checked **2026-09-10** — every price below moves, so re-check before you buy.*
*Everything marked **[reasoning]** is my own inference from the repo, not a sourced fact.*

The question: where do the backend, the frontend and the supporting containers actually run, given
what `docker-compose.yml` runs locally today?

Short answer: **one Hetzner Cloud CX23 in Nuremberg or Falkenstein, running the compose stack behind
Caddy on `bikecheck.cloud`, ~€6.6/month including Czech VAT.** The reasoning is below; skip to
[Recommendation](#4-recommendation) if you only want the verdict.

---

## 1. What has to be hosted

Read out of the repo, not assumed.

| # | Component | What it is | Resource shape | Needed for v1? |
|---|-----------|-----------|----------------|----------------|
| 1 | `monolith` | NestJS 11 app, `_backend/apps/monolith`. Global prefix `/api`, Swagger on `/api`, Bull Board on `/queues`, listens on `PORT` (3000). 20+ domains incl. `ai-chat`, `report`, `storage`, `gemini`, `strava`. | Node 22. **Bundles headless Chromium** (see #9) and `sharp`. ~1 GB RAM idle, spikes on a Chromium launch. **[reasoning]** | Yes |
| 2 | `strava-service` | Second NestJS app, `_backend/apps/strava-service`, port 3002. Strava OAuth token store + webhook receiver. Raw `pg` + `node-pg-migrate` (2 migrations), **no Prisma**. | Small, ~150 MB RAM. **[reasoning]** | Yes — Strava sync depends on it |
| 3 | `db-monolith` | Postgres **18.1-alpine**, `monolith_dev`, port 5432. Prisma 7.3, **62 migrations, 32 models**. | Small data volume at this scale; needs a persistent volume + backups. | Yes |
| 4 | `db-strava-service` | Postgres 18.1-alpine, `strava_service_dev`, host port 5433. Separate database, separate migration tool. | Tiny. | Yes |
| 5 | `redis` | redis 7-alpine. **BullMQ** queues: `strava-webhook-queue`, `strava-monolith-queue`, `gemini-queue`, `notification-queue`. Both apps connect. | ~50 MB. Needs persistence only for in-flight jobs. | Yes — the webhook path enqueues before answering Strava |
| 6 | Frontend | Vite 8 + React 19 + Mantine 9 **SPA**. No SSR, no PWA/service worker. `npm run build` = `tsc -b && vite build` → `dist/`, currently **5.1 MB**. | Static files only. | Yes |
| 7 | Android app | Capacitor 8, `appId com.bikecheck.app`, `webDir: dist` — the same `dist/` is bundled into the APK. `capacitor.config.ts` still points `server.url` at `http://192.168.1.111:5173` (dev live-reload). | Not hosted, but it calls the same API over the public internet. | Not blocking |
| 8 | Object storage | Cloudflare **R2** via `@aws-sdk/client-s3` (`CLOUDFLARE_*` env). Uploads are multer **memoryStorage** → `sharp` → R2. | **No persistent volume needed for uploads.** Already off-box. | Already solved |
| 9 | Headless Chromium | `playwright` + `playwright-extra` + stealth. Two consumers: `bike/bike-data-scraper` and `report/report-pdf.service.ts`, which prints a Report by opening the **public page** `/r/:token` in Chromium. ADR 0012 states plainly: *"Chromium is already a production dependency here."* | Ubuntu-based image (~1–2 GB), needs `--ipc=host` or Chromium can OOM-crash ([Playwright docs](https://playwright.dev/docs/docker)). Budget ≥1 GB RAM headroom per launch. **[reasoning]** | **Yes, unconditionally.** Both consumers are live: `report-pdf.service.ts`, *and* `BikeDataScrapeService`, which is provided in `bike.module.ts` and injected into `bike.controller.ts` behind `GET /external`, `/external/family`, `/external/components`. Deferring Reports does **not** remove Chromium. |
| 10 | AI chat | OpenAI `gpt-4o-mini` via the Vercel AI SDK (`generateText`, not `streamText`), plus `@google/generative-ai` for the `gemini` module. Answer is pushed to the client as **NDJSON on one held HTTP connection**, 10 s keepalive pings, `TIMEOUT_MS = 60_000`, up to 10 tool rounds. | No extra container — but the proxy in front **must not buffer** and must tolerate 60–90 s responses. | Yes (on this branch) |
| 11 | Push notifications | `firebase-admin`, `FIREBASE_SERVICE_ACCOUNT_BASE64`. | Env var only. | Optional |
| 12 | `loki` + `grafana` | Loki 2.9.0 filesystem storage + Grafana, fed by `pino-loki` from both apps (`LOKI_HOST`). | **Measured 143 MB** for the pair (Loki 47 MB + Grafana 96 MB) — over half the whole compose stack. | **No** |
| 13 | bg-removal ("withoutbg") | **Not wired into the app.** Only `_backend/remove_bg/remove-bg.mjs`, a standalone smoke test hitting `http://localhost:8080/api/v1/remove-background`. No backend or frontend code references port 8080 or the service. Run manually via `docker run`, not in compose. | Python/ML server, CPU inference. Actual image size/RAM **not verifiable from this repo** — the image is not referenced anywhere. | **No** |
| 14 | `_mobile/` | Contains only `node_modules/`. Dead folder. | — | No |

**Measured, not estimated** (Docker Desktop, idle dev stack, checked 2026-09-10): the whole compose
stack runs at **262 MB** — `db-monolith` 68 MB, `db-strava-service` 36 MB, `redis` 16 MB, `loki`
47 MB, `grafana` 96 MB, all at ~0–1 % CPU. Two caveats: `docker-compose.yml` contains **no
application containers**, so the two Nest apps and any Chromium launch land *on top* of that figure;
and dropping Loki + Grafana (#12) removes 143 MB of the 262 MB. Realistic production floor is
therefore **~120 MB of infrastructure** plus the apps.

Things that are **not** in the app, checked and confirmed absent:

- **No email sending** — no nodemailer/resend/sendgrid/SES in `_backend/package.json`.
- **No cron yet** — ADR 0025 (`deleted-files-are-queued-not-deleted-inline`) specifies a `@nestjs/schedule` cron to drain `pending_file_deletions`, and marks itself *"accepted, not yet built"*. `@nestjs/schedule` is not a dependency. Once built it runs inside the monolith, so it needs a **long-running process, not a serverless function**.
- **No WebSocket server** — the chat uses a plain held POST (NDJSON), not `socket.io` or SSE.
- **Secrets are not committed** — `.env` is gitignored; only `_backend/.env.test` is tracked.

### Public, unauthenticated surface

`report.controller.ts` has three `@Public()` routes and `auth.controller.ts` has eight. ADR 0012:
*"The public web build is a hard dependency. Sharing and PDF both stop working until this app is
deployed as a website at `PUBLIC_APP_URL`, with `/r/:token` outside the authenticated shell."*
ADR 0013 serves report attachments through the report. So: the SPA must be publicly reachable at a
stable HTTPS URL, and the backend must be able to reach that same URL from inside its own container
to print the PDF. **[reasoning]**

### Env vars already externalised

`monolith`: `NODE_ENV, PORT, DATABASE_URL, JWT_SECRET, JWT_EXPIRATION_DEV/PROD,
REFRESH_TOKEN_EXPIRATION_DAYS, GOOGLE_CLIENT_ID/SECRET, OPENAI_API_KEY, GEMINI_API_KEY,
CLOUDFLARE_* (6), STRAVA_SERVICE_URL, INTERNAL_API_SECRET, FIREBASE_SERVICE_ACCOUNT_BASE64,
FRONTEND_URL, PUBLIC_APP_URL, LOKI_HOST, UPLOAD_DIR`.
`strava-service`: `NODE_ENV, PORT, DATABASE_URL, STRAVA_CLIENT_ID/SECRET, INTERNAL_API_SECRET,
STRAVA_SERVICE_URL, FRONTEND_URL, APP_DEEP_LINK_URL, LOKI_HOST`.

Two that are **read directly from `process.env` and are missing from the `.env` files**:
`CORS_ORIGINS` (`main.ts`, falls back to `origin: true` = reflect any origin) and `REDIS_HOST`
(`app.module.ts`, falls back to `localhost`). Both must be set in production.

---

## 2. Constraints that decide the answer

| # | Constraint | Where it comes from | What it rules out |
|---|-----------|--------------------|-------------------|
| C1 | **A stable, public callback URL for Strava.** The subscription handshake is a `GET` echoing `hub.challenge`, and every event `POST` must be acknowledged **200 within two seconds**, three retries otherwise; **one subscription per application**; callback URL max 255 chars ([Strava webhook docs](https://developers.strava.com/docs/webhooks/)). Today it runs through ngrok (`syrup-latch-certainty.ngrok-free.dev`). | Strava docs + `strava-webhook.controller.ts` | Anything that sleeps/cold-starts. A 15-minute idle spin-down (Render Free, [docs](https://render.com/docs/free)) blows the 2-second budget on the first event after idle. |
| C2 | **Headless Chromium in the backend image — unconditionally.** Two independent live consumers: the Report PDF (ADR 0012) *and* the bike-data scraper, which is wired into `bike.module.ts` and served on three `/api/bike/external*` endpoints. Cutting one feature does not cut Chromium. | ADR 0012, `report-pdf.service.ts`, `bike.controller.ts`, `bike.module.ts` | Free/512 MB tiers; anything that caps image size hard; `node:22-alpine` (the current Dockerfile's base — Playwright ships Ubuntu images). |
| C3 | **Two Postgres databases + Redis, always on.** | `docker-compose.yml`, two migration toolchains | Free managed-Postgres tiers that pause: Supabase Free pauses a project *"After 1 week of inactivity"* ([pricing](https://supabase.com/pricing)); Render's free Postgres *"expire 30 days after creation"* ([docs](https://render.com/docs/free)). |
| C4 | **A 60–90 s unbuffered response** for AI chat NDJSON. | `ai-chat.controller.ts` (`KEEPALIVE_MS`, `TIMEOUT_MS = 60_000`) | Any proxy with a short fixed read timeout, or one that buffers the body. Cloudflare's documented Proxy Read Timeout is **125 s** ([connection limits](https://developers.cloudflare.com/fundamentals/reference/connection-limits/)) — fine, but not much slack if the tool loop is extended. |
| C5 | **One origin for the browser, or deliberate cross-site cookie work.** Auth is httpOnly cookies; `vite.config.ts` proxies `/api` and `/strava` in dev precisely so *"the browser sees one origin and the cookie travels"*. | `vite.config.ts`, `main.ts` (`credentials: true`) | Splitting the SPA onto a CDN host under a *different registrable domain* than the API. Same-registrable-domain subdomains are same-site and would work, but the zero-risk path is one hostname with `/api` and `/strava` proxied — exactly the dev topology. **[reasoning]** |
| C6 | **EU data location.** Czech user, personal data (Strava tokens, emails, photos). | — | US-only regions. Hetzner EU: Nuremberg, Falkenstein, Helsinki ([cloud](https://www.hetzner.com/cloud/)). Railway EU: Amsterdam `europe-west4-drams3a` ([regions](https://docs.railway.com/reference/regions)). Neon EU: Frankfurt, London ([regions](https://neon.com/docs/introduction/regions)). |
| C7 | **Budget: hobby.** Single-digit to low-hundreds of users. | Project shape | Per-service metered PaaS where 5 always-on services each bill RAM. |
| C8 | **No ops time.** Solo dev, evenings. | CLAUDE.md tone, `scripts/` has one PowerShell file, `.github/` has **no workflows** — there is no CI and no deploy pipeline today. | A hand-rolled systemd/nginx/certbot setup you have to remember how to fix in six months. |

---

## 3. The options

### 3.1 Single VPS running docker-compose

**Concretely:** one Linux box, `git pull` + `docker compose up -d`, Caddy in front terminating TLS
and proxying `/api` → monolith:3000, `/strava` → strava-service:3002, everything else → the static
`dist/`. The two Postgres containers and Redis stay exactly as they are in `docker-compose.yml`.

**Cost (EU, published prices, VAT excluded unless noted):**

| Provider | Plan | vCPU / RAM / disk | Traffic | Price/mo |
|---|---|---|---|---|
| Hetzner | CX23 | 2 / 4 GB / 40 GB NVMe | ≥20 TB (EU) | **€5.49** |
| Hetzner | CX33 | 4 / 8 GB / 80 GB NVMe | ≥20 TB (EU) | **€8.49** |
| Hetzner | CX43 | 8 / 16 GB / 160 GB | ≥20 TB (EU) | €15.99 |
| Hetzner | CAX11 / CAX21 / CAX31 (ARM) | — | ≥20 TB (EU) | €5.99 / €10.49 / €20.99 |
| DigitalOcean | Basic | 2 / 4 GB / 80 GB | 4 TB | $24.00 |
| DigitalOcean | Basic | 4 / 8 GB / 160 GB | 5 TB | $48.00 |
| Contabo | Cloud VPS 4 | 4 / 8 GB / 100 GB SSD | "unlimited" (fair use) | €5.50 (first 24 months) |

Sources: Hetzner prices and *"All prices are excluding VAT"* from the
[price adjustment notice effective 15 June 2026](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/);
specs (CX23 2/4/40, CX33 4/8/80, CX43 8/16/160, ≥20 TB EU traffic, "Price incl. IPv4") from
[Hetzner cost-optimized](https://www.hetzner.com/cloud/cost-optimized/) and
[regular performance](https://www.hetzner.com/cloud/regular-performance/);
[DigitalOcean droplet pricing](https://www.digitalocean.com/pricing/droplets);
[Contabo VPS](https://contabo.com/en/vps/).

**What you operate:** OS updates, Docker, Caddy config, Postgres backups (`pg_dump` to R2 on a cron
— R2 gives 10 GB-month free and free egress, [R2 pricing](https://developers.cloudflare.com/r2/pricing/)),
and watching disk. Caddy handles TLS itself: it *"serves all sites over HTTPS"*, obtains certs from
Let's Encrypt/ZeroSSL and renews them, given A/AAAA records and ports 80/443
([Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https)).

**Where it breaks:** the box is a single point of failure; a bad `docker compose up` is downtime;
you own backup restores. At this scale that is acceptable. **[reasoning]**

**ARM caveat:** CAX plans are cheap, but Playwright's documented Docker images are Ubuntu
amd64/arm64 variants and this repo has never been built on ARM. Not worth the debugging. **[reasoning]**

### 3.2 The same VPS with a self-hosted PaaS on top (Coolify / Dokploy)

**Concretely:** same Hetzner box, plus Coolify installed on it. You get git-push deploys, a UI for
env vars, one-click Postgres/Redis, automatic Let's Encrypt via its bundled proxy, and scheduled
backups — without learning systemd.

**Cost:** Coolify self-hosted is *"Completely free… Full access to all features… No limitation or
restrictions"*, unlimited connected servers; their hosted control plane is $5/mo for 2 servers
([Coolify pricing](https://coolify.io/pricing)). Dokploy Cloud is $4.50/mo per server
([Dokploy pricing](https://dokploy.com/pricing)) — whether Dokploy's self-hosted build is free is
**not stated on that page**, so treat it as unverified.

**Where it breaks:** Coolify itself wants roughly a GB of RAM and is another thing that can break;
its compose support is good but you will still hand-write the routing for the one-origin
layout. **[reasoning]**

### 3.3 Container PaaS — Railway

**Concretely:** 5 services (monolith, strava-service, 2× Postgres, Redis), EU West Metal
(Amsterdam). Private networking between them, volumes for the databases.

**Cost:** Hobby is **$5/month including $5 of usage credit**; usage is metered at
~**$10/GB-month RAM** and ~**$20/vCPU-month**, volumes $0.15/GB-month, egress $0.05/GB
([Railway pricing](https://railway.com/pricing)). The Free plan caps a service at
**1 vCPU / 0.5 GB** with a 500 MB volume — under C2 that cannot run the Chromium image.

**[reasoning]** Five always-on services at a conservative 2.5–3 GB total is ~$25–35/month of metered
usage before CPU spikes from Chromium — three to four times the VPS, for an app with a handful of
users.

**Where it breaks:** cost scales with the number of always-on containers, which is the one axis this
app is expensive on. Also, EU region availability per plan tier is **not stated** on Railway's
regions page.

### 3.4 Container PaaS — Render

**Concretely:** monolith as a Web Service, strava-service as a second Web Service, Render Postgres
×2, Key Value (Redis), static site for the SPA.

**Cost:** compute plans run `free` (0.1 CPU / 512 MB) through `12c-96g`
([compute plans](https://render.com/docs/compute-plans)). Render's own pricing page reports
**Starter $7/mo (512 MB, 0.5 CPU)** and **Standard $25/mo (2 GB, 1 CPU)** — the pricing page is
JS-rendered and I could not read the full table directly, so treat the exact figures as
**reported by Render but not re-verified** ([Render pricing](https://render.com/pricing)).

**Where it breaks:** the free tier is disqualified twice over — *"Render spins down a Free web
service that goes 15 minutes without receiving any inbound traffic"* and free Postgres *"expire 30
days after creation"* ([Render free tier](https://render.com/docs/free)). Free services also cannot
use persistent disks. Paid, it lands near Railway's number.

### 3.5 Container PaaS — Fly.io

**Cost (Amsterdam):** `shared-cpu-1x` 1 GB **$5.92/mo**, 2 GB **$11.11/mo**; `shared-cpu-2x` 4 GB
$22.22/mo; volumes **$0.15/GB-month**; EU egress **$0.02/GB**; dedicated IPv4 $2/mo; stopped
machines $0.15/GB of rootfs per 30 days ([Fly.io pricing](https://fly.io/docs/about/pricing/)).
Machines do not auto-stop unless configured.

**[reasoning]** Same arithmetic as Railway: 5 machines plus volumes lands around $25–40/month, and
you now also run Postgres yourself on Fly volumes. Scale-to-zero is tempting for the *bg-removal*
container (#13) but fatal for the Strava webhook receiver (C1).

### 3.6 Split hosting — static SPA on a CDN + backend elsewhere

**Cloudflare Pages (free):** 500 builds/month, 1 concurrent build, up to 20,000 files, 25 MiB max
per asset, 100 custom domains per project ([Pages limits](https://developers.cloudflare.com/pages/platform/limits/)).
The limits page **does not state a bandwidth cap** — I could not verify "unlimited bandwidth" from a
first-party page, so do not rely on it. The 5.1 MB `dist/` is nowhere near any of these limits.

**Vercel Hobby:** disqualified if this ever earns money — *"Hobby teams are restricted to
non-commercial personal use only. All commercial usage of the platform requires either a Pro or
Enterprise plan"* ([fair use](https://vercel.com/docs/limits/fair-use-guidelines)); typical Hobby
usage guideline is up to 100 GB Fast Data Transfer.

**Netlify:** the Free plan on the pricing page is expressed as a "300 credit limit" with custom
domains + SSL; **bandwidth, build minutes and any commercial-use restriction are not stated on that
page** ([Netlify pricing](https://www.netlify.com/pricing/)) — unverified.

**Where it breaks (C5):** the SPA and the API end up on two hostnames. Same-registrable-domain
subdomains (`app.bikecheck.cloud` + `api.bikecheck.cloud`) are same-site and Lax cookies survive, but you
must then set `CORS_ORIGINS` correctly and keep `credentials: true` working across the pair. Serving
`dist/` from the same Caddy that proxies `/api` reproduces the dev topology exactly and removes the
whole class of problem for €0. **[reasoning]** Split hosting buys you a CDN you do not need for
5.1 MB of assets and single-digit users.

### 3.7 Managed Postgres

| Option | Free tier | Paid entry | EU region | Notes |
|---|---|---|---|---|
| Neon | 0.5 GB storage/project, 100 CU-h/project, 100 projects, 5 GB egress, 6 h history, always-on compute | Launch, pay-as-you-go $0.106/CU-h; Scale $0.222/CU-h | Frankfurt `aws-eu-central-1`, London | Postgres major versions **not stated** on the pages read |
| Supabase | 500 MB DB, 5 GB egress, 2 active projects, **pauses after 1 week of inactivity** | Pro $25/mo (Micro compute, 8 GB disk, 250 GB egress, 7-day backups) | not stated on the pricing page | Pooler details not stated on the pricing page |
| Railway Postgres | metered like any service (~$10/GB-mo RAM) | — | Amsterdam | — |
| Self-hosted in compose | free | free | wherever the VPS is | You own backups |

Sources: [Neon pricing](https://neon.com/pricing), [Neon regions](https://neon.com/docs/introduction/regions),
[Supabase pricing](https://supabase.com/pricing), [Railway pricing](https://railway.com/pricing).

**Prisma + pooler caveat, if you go managed:** Prisma documents that a pooler must run in
**transaction mode**, that `pgbouncer=true` is for PgBouncer **below 1.21.0** and is *not*
recommended from 1.21.0 on, and — the one that bites — *"the Schema Engine is designed to use a
single connection to the database, and does not support connection pooling with PgBouncer"*, so
migrations need a separate **direct** URL alongside the pooled `DATABASE_URL`
([Prisma + PgBouncer](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer)).
That is one more env var and one more way to break a deploy. On a VPS, Postgres is a container on
the same Docker network with no pooler at all.

**Version note:** the repo pins `postgres:18.1-alpine`. I could **not verify from first-party pages**
that Neon/Supabase offer Postgres 18. Self-hosting keeps the version under your control.

### 3.8 Logs and observability

| Option | Cost | Verdict |
|---|---|---|
| Keep Loki + Grafana in compose | free, ~300–400 MB RAM **[reasoning]** | Works, but it is two more containers to babysit for one user's logs |
| Grafana Cloud Free | **50 GB logs/month ingested, 14-day retention, 3 users**; 10k metrics series; Pro from $19/mo ([Grafana pricing](https://grafana.com/pricing/)) | Best value: you already emit via `pino-loki`, so this is a change of `LOKI_HOST` and a token |
| Just `docker logs` / provider logs | free | Enough for month one |

**Plainly: for a solo hobby app, do not run Loki and Grafana on your production box.** Point
`LOKI_HOST` at Grafana Cloud's free tier — 50 GB/month is orders of magnitude more than this app
produces **[reasoning]** — or drop the transport and read `docker logs`. Either way you get ~400 MB
of RAM back.

### 3.9 The bg-removal container

It is **not part of the application** (see #13). Nothing in `_backend/src` or the frontend calls
port 8080; the only client is a smoke-test script with a hard-coded `D:\Projects\...` path.

Options, cheapest first:

1. **Don't host it.** Ship v1 without it. Zero cost, zero risk.
2. **Run it on the same VPS**, started only when needed. A CX23's 4 GB probably does *not* have room
   for a CPU-inference image alongside the rest **[reasoning]** — and I cannot size it, because the
   image is not named anywhere in the repo. If it ships, price a CX33 or a second box then.
3. **Scale-to-zero elsewhere** (a Fly machine that auto-stops, $0.15/GB-month of rootfs while
   stopped, [Fly pricing](https://fly.io/docs/about/pricing/)). Cold start on a several-GB ML image
   is measured in tens of seconds **[reasoning]** — acceptable for a "remove the background of this
   photo" action the user waits on, not acceptable inside a request path.
4. **A hosted background-removal API** instead of your own model. Not evaluated; no provider is
   referenced in the repo.

**Nothing in the hosting decision should be made for this container's sake.** If it ships later and
turns out to need 4 GB, that is a reason to rescale the box or give it its own, not a reason to pick
a different platform today. **[reasoning]**

### 3.10 Cost comparison

Everything needed to run the app: 2 Nest apps, 2 Postgres, Redis, static SPA, logs. Monthly.

| Setup | Compute | DB | Redis | Frontend | Logs | Total/mo | Verdict |
|---|---|---|---|---|---|---|---|
| **Hetzner CX23 + compose + Caddy** | €5.49 | in compose | in compose | same box | Grafana Cloud free | **€5.49 excl. VAT ≈ €6.6 incl. 21 % CZ VAT** | Recommended |
| Hetzner CX33 + compose + Caddy | €8.49 | in compose | in compose | same box | Grafana Cloud free | €8.49 excl. VAT ≈ €10.3 | The upgrade, if 2 vCPU proves tight |
| Hetzner CX23 + Coolify | €5.49 | Coolify-managed | Coolify-managed | same box | Grafana Cloud free | same €5.49 | Middle path, PaaS ergonomics |
| Contabo VPS 4 | €5.50 | in compose | in compose | same box | free | €5.50 (24-month intro) | Cheapest; intro pricing, less predictable IO **[reasoning]** |
| Railway Hobby (EU) | metered | metered | metered | static | included | **~$25–35 [reasoning]**, min $5 | Runner-up |
| Render (paid) | ~$7–25/service ×2 *(unverified)* | Render Postgres ×2 *(price unverified)* | Key Value *(price unverified)* | static free | included | **~$30–60 [reasoning]** | Free tier disqualified by C1/C3 |
| Fly.io (ams) | $5.92–11.11/machine ×2 | 2 machines + volumes | 1 machine | static elsewhere | — | **~$25–40 [reasoning]** | You still run Postgres yourself |
| Cloudflare Pages + VPS backend | €5.49–8.49 | in compose | in compose | free | free | ~€9 | Adds a CDN you do not need and a second origin (C5) |

Object storage sits outside all of these and stays on R2: free up to 10 GB-month, 1M Class A and
10M Class B operations, egress free ([R2 pricing](https://developers.cloudflare.com/r2/pricing/)).

---

## 4. Recommendation

### Take a Hetzner Cloud **CX23** (2 vCPU, 4 GB, 40 GB NVMe, ≥20 TB traffic) in **Nuremberg or Falkenstein**, run the existing compose stack on it behind **Caddy** on `bikecheck.cloud`, and serve the SPA from that same Caddy.

**Cost: €5.49/month excluding VAT ≈ €6.6/month with Czech 21 % VAT (~165 CZK)**, plus the domain, plus
R2 (free tier). Logs go to Grafana Cloud's free tier. Total all-in: **~€7/month.**

**Why 4 GB and not 8:** the measured compose stack is 262 MB, and 143 MB of that is Loki + Grafana,
which move to Grafana Cloud's free tier — leaving ~120 MB of infrastructure. The two Nest apps and a
per-request Chromium land on top. Chromium is launched *and closed inside one request*
(`chromium.launch()` → `browser.close()` in `report-pdf.service.ts`), so it is a spike, not a
resident cost. **[reasoning]**

**Where CX23 breaks:** 2 vCPU, and both a PDF render and a scrape are CPU-bound. Run them
concurrently and requests will queue. At single-digit users that is theoretical; if it stops being
theoretical, Hetzner rescales the server to a CX33 for €3/month more — this is not a one-way door.
**[reasoning]**

Why:

1. **The app's shape is "five always-on containers with a Chromium in one of them."** That is the
   single most expensive shape on per-service metered PaaS and the single cheapest on a VPS. Railway
   or Fly for the same stack is $25–40/month **[reasoning]** — 3–4× the price for an app with
   single-digit users.
2. **It removes constraints instead of working around them.** One origin (C5) — Caddy serves `/` and
   proxies `/api` and `/strava`, exactly like `vite.config.ts` does in dev. No cold starts to blow
   Strava's 2-second budget (C1). No proxy that buffers the chat NDJSON (C4). No pooler between
   Prisma and Postgres (3.7). Postgres stays on 18.1 because you chose it.
3. **`docker-compose.yml` already is the deployment.** You add a production Dockerfile and a Caddy
   file; you do not restructure anything.
4. **EU, GDPR-clean, and 20 TB of traffic** you will never touch.

**Runner-up: Railway (EU West Metal, Amsterdam), Hobby plan.**
Switch to it when *"I do not want to be the person who patches the OS"* outweighs €20/month — or the
first time you lose a weekend to the box. Railway gives you managed Postgres, managed Redis, private
networking and git-push deploys, and its Amsterdam region keeps data in the EU
([regions](https://docs.railway.com/reference/regions)). Its Free tier is not an option
(1 vCPU / 0.5 GB per service cannot hold the Chromium image).

**Middle path, if you want the VPS price with PaaS ergonomics:** the same CX23 with **Coolify**
installed (free, self-hosted). Costs nothing extra, gives you git-push deploys, TLS and scheduled
backups in a UI. Take this if hand-writing a Caddyfile and a backup cron sounds like the part you
will not finish. **[reasoning]**

---

## 5. Concrete first steps

Ordered. Roughly two evenings for steps 1–5. **[reasoning]**

**1. Write a production backend Dockerfile — the current one cannot ship.**
`_backend/Dockerfile` is a dev image: `node:22-alpine`, `npx prisma db push && npm run start:dev`.
Three things are wrong for production:

- **Alpine cannot run Playwright's Chromium.** Playwright publishes Ubuntu-based images
  (`mcr.microsoft.com/playwright:v1.6x-noble`) with browsers *and system dependencies*
  pre-installed, and notes the Playwright package itself is not in the image
  ([Playwright Docker](https://playwright.dev/docs/docker)). Either base on that image or install
  the browser dependencies yourself.
- **`prisma db push` is not a production migration path.** Use `prisma migrate deploy` — verified
  present in the installed CLI (`npx prisma migrate --help` lists it under *"Commands for
  production/staging"*), and documented as applying *"all pending migrations… Primarily used in
  non-development environments"*, without drift detection, reset or a shadow database
  ([Prisma CLI reference](https://www.prisma.io/docs/orm/reference/prisma-cli-reference)).
  Prisma's newer workflow docs push migrations into **CI/CD rather than container start**
  ([development and production](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production));
  with a single instance, running it in an entrypoint before `node dist/main.js` is also fine —
  Postgres serialises concurrent runs with advisory locks.
- **Run the compiled output.** NestJS documents `npm run build` then `node dist/main.js`, with
  `NODE_ENV=production` ([NestJS deployment](https://docs.nestjs.com/deployment)). Multi-stage:
  build in one layer, `npm ci --omit=dev` + `prisma generate` in the runtime layer.
- Run Chromium containers with `--ipc=host` (Playwright: *"Without it, Chromium can run out of
  memory and crash"*) and `--init`.

**2. Decide how `strava-service` is built.** Same repo, same `package.json`, different entry point
(`nest build strava-service`). One image with two commands is simpler than two images, and it does
**not** need Chromium. **[reasoning]**

**3. Externalise the two env vars read from `process.env` but absent from the `.env` files:**
`CORS_ORIGINS` (else `main.ts` reflects any origin) and `REDIS_HOST` (else `localhost`, which is
wrong the moment Redis is a separate container). Also flip `PUBLIC_APP_URL`, `FRONTEND_URL`,
`STRAVA_SERVICE_URL` and `APP_DEEP_LINK_URL` from localhost to the real domain, and remove
`server.url` from `capacitor.config.ts` before building a real APK.

**4. Add a `docker-compose.prod.yml` + Caddyfile.** Keep the two Postgres services and Redis as they
are; drop Loki and Grafana; add the two app services and Caddy. Sketch:

```
bikecheck.cloud {
    handle_path /api/* { reverse_proxy monolith:3000 }
    handle_path /strava/* { reverse_proxy strava-service:3002 }
    handle { root * /srv/dist; try_files {path} /index.html; file_server }
}
```

Notes: keep the SPA fallback (`try_files … /index.html`) or `/r/:token` 404s; keep the `/api` prefix
because `main.ts` sets `setGlobalPrefix('api')`; and **do not expose Bull Board (`/queues`) or
Swagger (`/api` root) publicly** without auth. Caddy does TLS by itself given DNS and ports 80/443
([automatic HTTPS](https://caddyserver.com/docs/automatic-https)).

**5. Point Strava at the real URL.** Delete the ngrok subscription and create a new one against
`https://bikecheck.cloud/strava/webhook` — remember **one subscription per application** and the
handshake echoing `hub.challenge` ([Strava webhooks](https://developers.strava.com/docs/webhooks/)).
`subscription-url.md` in the repo has the exact curl; the client secret in it is in git history, so
**rotate it**.

**6. Databases and Redis map 1:1.** `db-monolith` → same container, volume on the VPS disk;
`db-strava-service` → same, reachable on 5432 inside the compose network (the `5433:5432` host
mapping is a local-dev artefact — inside Docker both listen on 5432 under different hostnames).
Redis stays as-is with `REDIS_HOST=redis`. Add a nightly `pg_dump` of both into R2 and **test one
restore** before you trust it. **[reasoning]**

**7. CI.** `.github/workflows/` is empty today. Minimum viable: on push to `main`, build both images,
push to GHCR, SSH to the box, `docker compose pull && docker compose up -d`, then
`prisma migrate deploy`. Frontend: `npm ci && npm run build` (`tsc -b && vite build`) and rsync
`dist/` into the volume Caddy serves. If you install Coolify, a webhook replaces this step.

**8. Only then** consider the bg-removal container, and only if the feature is actually in v1.

---

## 6. Open questions

**Could not verify from a first-party source:**

- **Exact Hetzner CX plan prices on the live cloud pricing page** — the price tables are
  JS-rendered and did not come through. The figures used (CX23 €5.49, CX33 €8.49, CX43 €15.99, CAX
  €5.99/€10.49/€20.99, excl. VAT) come from Hetzner's own
  [price-adjustment notice of 15 June 2026](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/).
  Confirm in the Hetzner console before ordering.
- **Render's exact instance prices** ($7 Starter / $25 Standard) — reported by render.com but the
  pricing table itself is JS-rendered and unreadable to a fetch. Render Postgres, Key Value and
  persistent-disk prices: **not verified at all**.
- **Cloudflare Pages bandwidth** — the limits page states file, build and domain limits but **no
  bandwidth figure**. Do not plan on "unlimited".
- **Netlify Free** — bandwidth, build minutes and commercial-use terms are not on the pricing page.
- **Whether Strava requires HTTPS for the callback URL** — the webhook docs specify the handshake,
  the 2-second/200 acknowledgement, the 255-character limit and one subscription per app, but **do
  not state a protocol requirement**. Use HTTPS regardless (OAuth tokens ride the same host).
- **Postgres 18 availability on Neon and Supabase** — not stated on the pages read. Relevant only if
  you go managed.
- **Railway region availability per plan tier** — not stated on the regions page.
- **Dokploy self-hosted licensing/price** — not stated on its pricing page.
- **The bg-removal image's size, RAM floor and GPU need** — the image is not named anywhere in this
  repo, so there was nothing to look up.

**Only you can decide:**

1. **Budget ceiling.** Is the ~€10/month VPS the target, or is €20–25/month for Railway worth never
   touching a server? This is the whole decision.
2. ~~**Domain.**~~ **Answered:** `bikecheck.cloud` is registered. The one-origin layout in step 4 uses
   it as the apex — Caddy serves the SPA on `bikecheck.cloud` and proxies `/api` and `/strava` to the
   two Nest apps, which is exactly the dev topology in `vite.config.ts`.
3. **Does bg-removal ship in v1?** If yes, it needs sizing before you pick the VPS plan.
4. ~~**Do Reports/PDF ship in v1?**~~ **Moot — the earlier version of this document got this wrong.**
   Deferring Reports does not remove Chromium from the image, because `BikeDataScrapeService` uses
   Playwright too and is already live on three `/api/bike/external*` endpoints. Chromium is in the
   production image either way; plan the box for it. Reports remain a *feature* decision, not a
   hosting one.
5. **Does the Android app ship at the same time?** It needs the API on a stable HTTPS host and
   `APP_DEEP_LINK_URL` pointing at real Android App Links for a shared report to open in the app.
6. **Is `organization` (bike-shop/mechanic mode) real?** ROADMAP lists it as an open question. If it
   becomes multi-tenant with real shops, the answer changes from "one box" to "one box with a
   restore plan you have actually tested".

---

## 7. Sources

All fetched 2026-09-10.

| Source | Used for |
|---|---|
| https://developers.strava.com/docs/webhooks/ | Callback handshake (`hub.mode`/`hub.challenge`/`hub.verify_token`), 200-within-2-seconds rule, 3 retries, one subscription per app, 255-char URL limit |
| https://www.hetzner.com/cloud/ | EU locations (Nuremberg, Falkenstein, Helsinki) and plan families |
| https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/ | CX/CAX/CCX monthly prices effective 15 June 2026; "All prices are excluding VAT" |
| https://www.hetzner.com/cloud/cost-optimized/ | CX23/33/43/53 specs, ≥20 TB EU traffic, "Price incl. IPv4" |
| https://www.hetzner.com/cloud/regular-performance/ | CPX specs and per-location traffic allowances |
| https://www.digitalocean.com/pricing/droplets | Basic Droplet specs and USD prices, backup pricing |
| https://contabo.com/en/vps/ | Cloud VPS plans, €5.50 entry price, contract terms |
| https://railway.com/pricing | Plan tiers, $5 Hobby with $5 credit, per-GB/vCPU metering, egress, Free-plan 1 vCPU/0.5 GB cap, volume caps |
| https://docs.railway.com/reference/regions | EU West Metal (Amsterdam) region |
| https://render.com/docs/free | 15-minute spin-down, 750 instance-hours, free Postgres 30-day expiry, no persistent disks on free |
| https://render.com/docs/compute-plans | Compute plan IDs, CPU/RAM ladder |
| https://render.com/pricing | Starter $7 / Standard $25 (JS-rendered; treated as unverified) |
| https://fly.io/docs/about/pricing/ | Machine prices in Amsterdam, volumes $0.15/GB-mo, EU egress $0.02/GB, stopped-machine cost |
| https://coolify.io/pricing | Self-hosted free, unlimited servers; cloud $5/mo |
| https://dokploy.com/pricing | Cloud $4.50/mo per server |
| https://developers.cloudflare.com/pages/platform/limits/ | Pages free-plan build, file, size and domain limits; absence of a bandwidth figure |
| https://developers.cloudflare.com/r2/pricing/ | R2 storage/ops pricing, free egress, free-tier allowances |
| https://developers.cloudflare.com/fundamentals/reference/connection-limits/ | 125 s Proxy Read Timeout (524), 900 s idle timeout — relevance to the chat NDJSON connection |
| https://vercel.com/docs/limits/fair-use-guidelines | Hobby is non-commercial only; Hobby usage guidelines |
| https://www.netlify.com/pricing/ | Free plan credits, $9 Personal tier (bandwidth not stated) |
| https://neon.com/pricing | Free plan limits, Launch/Scale CU-hour prices, history/restore windows |
| https://neon.com/docs/introduction/regions | EU regions (Frankfurt, London) |
| https://supabase.com/pricing | Free 500 MB, 1-week inactivity pause, 2 active projects; Pro $25 |
| https://grafana.com/pricing/ | Free tier: 50 GB logs/month, 14-day retention, 3 users; Pro from $19/mo |
| https://www.prisma.io/docs/orm/reference/prisma-cli-reference | `prisma migrate deploy` semantics; `prisma generate` |
| https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production | Migrations belong in CI/CD; transactional + advisory-locked on Postgres |
| https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer | Transaction mode requirement, `pgbouncer=true` guidance, Schema Engine needs a direct connection |
| https://docs.nestjs.com/deployment | `NODE_ENV=production`, build then `node dist/main.js` |
| https://playwright.dev/docs/docker | Ubuntu-based official images, `--ipc=host` or Chromium OOMs, `--init` |
| https://caddyserver.com/docs/automatic-https | Automatic Let's Encrypt/ZeroSSL certs, renewal, HTTP→HTTPS redirect, DNS + ports 80/443 requirement |

Repo files this document was built from: `docker-compose.yml`, `docker/loki-config.yml`,
`_backend/package.json`, `_backend/nest-cli.json`, `_backend/Dockerfile`,
`_backend/apps/monolith/src/{main.ts,app.module.ts}`,
`_backend/apps/monolith/src/ai-chat/ai-chat.{controller,service}.ts`,
`_backend/apps/monolith/src/storage/storage.service.ts`,
`_backend/apps/monolith/src/report/report-pdf.service.ts`,
`_backend/apps/monolith/src/bike/bike-data-scraper/bike-data-scraper.service.ts`,
`_backend/apps/monolith/prisma/schema.prisma`,
`_backend/apps/strava-service/src/strava-webhook/strava-webhook.controller.ts`,
`_backend/remove_bg/remove-bg.mjs`,
`_frontend/bikecheck/{package.json,vite.config.ts,index.html,capacitor.config.ts}`,
`docs/adr/0012`, `docs/adr/0013`, `docs/adr/0025`, `ROADMAP.md`, `CONTEXT.md`.
