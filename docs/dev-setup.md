# Development setup

Setting up a new machine to work on BikeCheck, from an empty disk to a running app.

## 1. Install

- Git
- Node 22
- Docker Desktop

## 2. Clone and copy the env files

```bash
git clone https://github.com/Jaffator/bikecheck-app.git
```

The `.env` files hold secrets and are not in git. Copy them from the old machine:

| File | Holds |
|---|---|
| `_backend/apps/monolith/.env` | monolith database, Redis, Strava, Gemini, storage, mail |
| `_backend/apps/strava-service/.env` | strava-service database and Strava keys |
| `_frontend/bikecheck/.env`, `.env.local` | API base URL and frontend keys |

`.env.android`, `.env.web` and `_backend/.env.test` are in git.

## 3. Start the containers

From the repository root:

```bash
docker compose up -d
```

The images (PostgreSQL, Redis, Loki, Grafana) come from Docker Hub on the first run. Nothing has
to be carried over. Data does not come with them: the databases start empty.

| Service | Port |
|---|---|
| monolith database | 5432 |
| strava-service database | 5433 |
| Redis | 6379 |
| Loki | 3100 |
| Grafana | 3001 |

## 4. Install the packages

```bash
cd _backend && npm install
cd ../_frontend/bikecheck && npm install
```

## 5. Fill the databases

Choose one.

**Empty databases with test data:**

```bash
cd _backend
npx prisma migrate deploy --config apps/monolith/prisma.config.ts
DATABASE_URL=<strava-service database URL> npx node-pg-migrate up -m apps/strava-service/migrations
npm run db:devseed          # test data
npm run db:mockriders       # optional: riders with bikes, parts and services
npm run db:evalaccount      # optional: the account the chat eval runs against
```

**Your own data from the old machine:**

```bash
# on the old machine
docker compose exec -T db-monolith pg_dump -U jaroslav_user monolith_dev > monolith.sql
docker compose exec -T db-strava-service pg_dump -U jaroslav_user strava_service_dev > strava.sql

# on the new machine, after step 3
docker compose exec -T db-monolith psql -U jaroslav_user monolith_dev < monolith.sql
docker compose exec -T db-strava-service psql -U jaroslav_user strava_service_dev < strava.sql
```

## 6. Background removal (optional)

The withoutbg server removes backgrounds from bike photos. It is not in `docker-compose.yml` and is
started by hand:

```bash
docker run -d --rm --name withoutbg -p 8080:8080 withoutbg/withoutbg-openweights-v3-app-cpu:latest
```

## 7. Run the app

Each in its own terminal:

```bash
cd _backend && npm run monolith_app:start:dev     # API on :3000
cd _backend && npm run strava_app:start:dev       # Strava service
cd _frontend/bikecheck && npm run dev             # app on :5173
```

## 8. Check the code

```bash
# frontend typecheck
cd _frontend/bikecheck && npx tsc -b

# backend typecheck (plain `tsc --noEmit` checks nothing)
cd _backend && npx tsc --noEmit -p apps/monolith/tsconfig.app.json

# backend unit tests
cd _backend && npx jest --selectProjects=UNIT

# backend e2e tests: their own PostgreSQL on 5434 and Redis on 6380, Docker must be running
cd _backend && npm run test:e2e
```
