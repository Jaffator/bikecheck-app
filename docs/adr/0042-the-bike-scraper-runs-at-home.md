# The bike scraper runs at home, on the Raspberry Pi

Bike search reads 99spokes with a headless Chromium. Cloudflare in front of 99spokes answers the
results request (`api/trpc/bikes.listBikes`) with 403 to most browsers that do not look like a
person at home: the Hetzner IP was blocked outright (#246), and a browser on Hetzner going out
through a proxy on the home IP was blocked on most searches (#282). **The browser now runs on the
Raspberry Pi at home, in its own app (`apps/scraper`), and the monolith calls it over Tailscale.**
The monolith keeps the URL checks and matching the spec tables to component types; the Pi only
loads pages and hands back cards and raw tables.

## Considered options

Measured with the same Linux Chromium, 10 searches each:

| Path | Passed |
|---|---|
| Browser at home, no proxy | 10/10 on the Pi, 9/10 on a PC |
| Browser at home, HTTP/3 switched off | 1/5 clean |
| Browser on Hetzner through tinyproxy on the Pi | about 2/14 |
| Bright Data Browser API | 4/10 |
| DataImpulse rotating residential proxy | 1/4 |

**A proxy of any kind** was rejected. An HTTP proxy carries TCP only, so Chromium cannot use HTTP/3,
and the gap between the TCP round trip (to the proxy) and the browser's own (to Hetzner) gives the
proxy away. Retries, a fresh user agent and a different exit country did not move the numbers.

**A paid scraping service** (Scrapfly earlier, Bright Data now) was rejected: it costs per page and
still failed most searches.

## Consequences

- Bike search and the component picker depend on the Pi and the home uplink being up. When they are
  down the monolith answers 502, as it did when the proxy was down.
- The Pi runs 32-bit Raspbian on a 64-bit kernel. The `linux/arm64` image runs there only with
  `seccomp:unconfined`, and Docker cannot build it on the Pi, so CI builds it on an ARM runner.
- The Pi is updated by hand (`docker compose pull && up -d`), not by the tag deploy. The two talk
  through `libs/contracts/src/bike-scraper.contract.d.ts`; a change to it must reach the Pi first.
- The scraper has its own secret (`SCRAPER_API_SECRET`), not `INTERNAL_API_SECRET`: the Pi sits at
  home and should not hold the key to strava-service.
- The browser follows only `https://99spokes.com` URLs; it runs on the home network.
