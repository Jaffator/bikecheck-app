# syntax=docker/dockerfile:1
# Production edge image: Caddy plus the two static builds, so the server needs no Node (context: repo root).
FROM node:22-bookworm-slim AS spa
WORKDIR /app
COPY _frontend/bikecheck/package.json _frontend/bikecheck/package-lock.json ./
RUN npm ci
COPY _frontend/bikecheck ./
RUN npm run build:web

FROM node:22-bookworm-slim AS website
# Both empty: the website is built without the Umami tracker.
ARG UMAMI_WEBSITE_ID=""
ARG STATS_HOST=""
ENV UMAMI_WEBSITE_ID=$UMAMI_WEBSITE_ID STATS_HOST=$STATS_HOST
WORKDIR /app
COPY _website_landing/package.json _website_landing/package-lock.json ./
RUN npm ci
COPY _website_landing ./
RUN npm run build

FROM caddy:2
COPY --from=spa /app/dist /srv/spa
COPY --from=website /app/dist /srv/website
