# syntax=docker/dockerfile:1
# Production edge image: Caddy plus the two static builds, so the server needs no Node (context: repo root).
FROM node:22-bookworm-slim AS spa
# Empty ID: the App is built without the Umami tracker.
ARG STATS_HOST=""
ARG TRACKER_SCRIPT_NAME=""
ARG UMAMI_WEBSITE_ID_APP=""
# Process env beats the committed .env.web, so these reach import.meta.env.
ENV VITE_UMAMI_WEBSITE_ID=$UMAMI_WEBSITE_ID_APP VITE_UMAMI_SCRIPT_URL=https://$STATS_HOST/$TRACKER_SCRIPT_NAME
WORKDIR /app
COPY _frontend/bikecheck/package.json _frontend/bikecheck/package-lock.json ./
RUN npm ci
COPY _frontend/bikecheck ./
RUN npm run build:web

FROM node:22-bookworm-slim AS website
# Empty ID: the Marketing Website is built without the Umami tracker.
ARG STATS_HOST=""
ARG TRACKER_SCRIPT_NAME=""
ARG UMAMI_WEBSITE_ID_WEB=""
ENV STATS_HOST=$STATS_HOST TRACKER_SCRIPT_NAME=$TRACKER_SCRIPT_NAME UMAMI_WEBSITE_ID=$UMAMI_WEBSITE_ID_WEB
WORKDIR /app
COPY _website_landing/package.json _website_landing/package-lock.json ./
RUN npm ci
COPY _website_landing ./
RUN npm run build

FROM caddy:2
COPY --from=spa /app/dist /srv/spa
COPY --from=website /app/dist /srv/website
