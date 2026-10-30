# Monetization

*Research note, 2026-10-30. Branch `feat/design` @ `9cd3f0c`. External sources fetched 2026-10-30.*
*Updated the same day after #308: M9 is decided, and the Gemini rows describe the shipped AI review.*
*Answers ROADMAP.md's open question "is there a free/pro split planned?". Strava capacity comes from [`go-live.md`](go-live.md) (A §3.3) and the box cost from [`hosting.md`](hosting.md); neither is re-researched here. Store rules and fees changed several times in 2025–2026, so re-check them before shipping. **[reasoning]** marks an inference, not a sourced fact. §5 is input for a daňový poradce, not tax advice.*

---

## 0. The short version

- **Model:** freemium with one **Pro** tier. The core loop stays free: bikes, parts, Services, Service Tracking and its pushes, Strava sync, and Reports. Pro sells more bikes, AI and room, plus roadmap features as they ship.
- **The line:** Free gets 2 active bikes, 1 Setup Profile per bike, 20 attachments and 10 AI questions a month. Pro lifts every limit (fair use) and gets the new features (§3.2).
- **Price:** **690 Kč / €27.99 a year**, which you lead with, or 89 Kč / €3.49 a month. **Trial:** every new account gets 14 days of Pro, with no card, computed on the server.
- **What to expect:** Health & Fitness apps convert a median 2.9 % of downloads by day 35 (RevenueCat). So 1,000 riders ≈ 30 payers ≈ 20k Kč a year **[reasoning]**. That covers the box and the Strava subscription, not a salary.
- **Web:** Stripe Checkout + Billing + Customer Portal. A **neplátce** selling inside the EU (under €10k a year to other EU countries, under CZK 2M turnover) sells directly and charges no VAT: about 97 % of 690 Kč kept. A **plátce**, or anyone selling outside the EU, turns on **Stripe Managed Payments** (Stripe sells and handles VAT, +3.5 %): about 76 % kept (§4.2).
- **Android:** consumption-only first: nothing is sold in the app, a web purchase unlocks Pro, and the app may say so in plain text but not link. Later, Play Billing through RevenueCat (free under $2,500 a month): Google keeps 15 % (10 % + a 5 % billing fee), about 70 % kept.
- **Backend:** a new `billing` domain, one `entitlements` table, limits enforced on four create routes (§7, a proposal).
- **Blockers first:** until Strava reviews the app at most 10 riders can connect, and rides arrive only from Strava. Android is still in Play's closed test.
- **Legal, before the first sale:** the Terms name no seller; their §8 "All sales are final" contradicts the EU 14-day withdrawal right; direct web sales need a withdrawal button from 1 January 2027 (CZ Act 159/2026).
- **Gemini ride summary (decided in #308):** it is now an AI review in the ride detail, written on the first open and free on every plan (ADR 0044), so a ride nobody opens costs nothing.

### 0.1 Your decisions (nothing below is decided)

| # | Decision | Recommendation | Why |
|---|---|---|---|
| M1 | Model | Freemium, one Pro tier | Every tracker found keeps its core free (§2), and the Reports and Profiles that free riders share are the marketing |
| M2 | Free bike limit | 2 active bikes; archived ones don't count | A bike costs nothing to run, so the limit fences value rather than cost. WatchMy.bike allows 3, Velo Buddy 1 |
| M3 | Price | 690 Kč / €27.99 a year, 89 Kč / €3.49 a month | Under Strava's 999 Kč, near ProBikeGarage's $24.99. Fixed fees eat monthly plans (§3.3) |
| M4 | Trial | 14-day reverse trial, no card | No store work and no repeat-trial abuse. Nothing is sold, so there is no withdrawal question |
| M5 | Riders already on the app | Keep everything shipped free for everyone; lifetime Pro for the closed-test testers | Taking features away costs trust. Garmin: "All existing features and data in Garmin Connect will remain free" |
| M6 | VAT status and business form | If you are free to choose: OSVČ neplátce on the flat-tax regime | It decides the web route (§5). Identified-person status keeps the flat tax; becoming a plátce ends it |
| M7 | Who sells on the web | Neplátce selling inside the EU only: Stripe direct. Otherwise: Stripe Managed Payments | You keep 668 Kč vs 524 Kč of a 690 Kč sale (§4.2) |
| M8 | Android | Consumption-only now; Play Billing via RevenueCat once the app is public | Play Billing needs a live listing anyway, and RevenueCat also covers a later iOS build |
| M9 | Gemini ride summary | **Decided (#308):** shown in the ride detail, written on the first open, free for everyone, model pinned to `gemini-3.5-flash-lite` (ADR 0044) | Paid per opened ride rather than per saved ride, on a model with no announced price rise |
| M10 | Workshop plan (`organization`) | Not now | It is scaffolding without UI, and shop software is another product at $52–125 a month |

---

## 1. What BikeCheck has, and what it costs per rider

**Where it runs:**
- The web app is live at `app.bikecheck.cloud` (v1.5.13).
- The Android app (`bikecheck.app`) **is not on Google Play yet**. It sits in the closed test ("No store listing yet (closed test)", `_website_landing/index.html:421`), and builds are uploaded by hand (`docs/deploy.md:63-77`).
- There is no iOS project.
- There is no billing code, table or dependency anywhere.

| Feature (CONTEXT.md terms) | Where | Runs on | Cost per rider |
|---|---|---|---|
| Bikes, parts, Services, Service Tracking, Plan, Setup Profiles, Public Profile, Follow, Home stats | `bike`, `component`, `bike-event`, `service-tracking`, `setup`, `profile`, `follow`, `stats` | Postgres on the box | ≈ 0 **[reasoning]** |
| Rides → wear | `strava-service` + `strava`. Rides arrive **only** from Strava: `ride.controller.ts` has no create route | Strava API, "currently provided at no charge" (API agreement §3.2, which reserves "differentiated pricing for business users"). Capacity 1 → 10 → review (go-live A §3.3) | No money, but a hard cap on riders |
| AI chat (`/chat`) | `ai-chat.service.ts:23` uses `gpt-4o-mini` with ≤10 tool rounds. Each rider gets 200k tokens per rolling 24 h (`AI_CHAT_DAILY_TOKEN_BUDGET`, `:35`, `:432`) | OpenAI: $0.15 in / $0.60 out per 1M tokens | At the cap, $0.03–0.12 a day **[reasoning]**; typical use is far below |
| Ride summary (AI review) | Since #308: `GET /rides/:id/summary` writes it on the first open of the ride detail, from an allowlist of the ride's fields, and keeps it in `rides.summary` (ADR 0044). The per-ride queue is gone | `gemini-3.5-flash-lite`: $0.30 / $2.50 per 1M tokens, no announced rise | Per opened ride, a fraction of a haléř **[reasoning]** |
| Bike photos, Service attachments | `storage.service.ts` stores to R2 as WebP, 1600 px, q80. Uploads are capped at 15 MB per file, with no cap on the count (`bike-event.controller.ts:34`, `bike.controller.ts:41`). `bike_event_attachments.size_bytes` is stored | R2: $0.015/GB-month, first 10 GB free, egress free | Cents a year **[reasoning]** |
| Reports + PDF | `report-pdf.service.ts` launches Chromium for each PDF; the route is throttled to 10/min (`report.controller.ts:122`) | The box's CPU and RAM | Small, bound by capacity |
| Bike search | 99spokes scraper on the home Raspberry Pi over Tailscale (ADR 0042) | Home | Bound by capacity |
| E-mail | `mail.service.ts` sends through Resend, only the Verification and Welcome mails. No notification type uses the `email` channel (`notification-types.config.ts:39-103`) | Resend Free: 3,000 a month, 100 a day. Pro: $20 a month for 50k | 2 mails per sign-up, so the free tier caps sign-ups at ~50 a day **[reasoning]** |
| Push | `push.service.ts` (firebase-admin) | FCM, "No-cost" | 0 |
| Background removal (withoutbg) | Not wired: only `_backend/remove_bg/remove-bg.mjs` exists | – | 0 today |
| AI component recognition, predictive intervals, cost per km | ROADMAP.md, "Product features"; not built | Recognition would cost a vision-model call per photo | Future Pro candidates |
| Shop / mechanic mode | `organization`: CRUD + members, no UI (ROADMAP.md) | – | – |

**Fixed costs to cover:** the Hetzner box (~€6.6 a month, hosting.md) and the Strava subscription, which you need to own an API app (go-live A §3.3), at 999 Kč a year. About five yearly Pro subscriptions pay for both **[reasoning]**.

---

## 2. Market (prices as shown on 2026-10-30)

| App | Model | Price | What is paid | Page date |
|---|---|---|---|---|
| ProBikeGarage | Free core + Premium | "$2.99/month*" or "$24.99/year*". The asterisk says prices "may vary slightly depending on the application store, the user's country and currency". The iOS app also costs $3.99 upfront | "Add up to 10GB of full-resolution photos, videos, or documents", "deeper insights into parts usage, enhanced maintenance tracking", and a daily instead of weekly full Strava sync. No bike or part limits are documented, and alerts look free **[reasoning]** | site ©2025; iOS v2.15.1, 2025-07-29 |
| Strava | Subscription to the whole app | "Kč149.00/month or Kč999.00/year", "30-day trial for CZK 0" | Gear is not on the subscriber list, so it looks free **[reasoning]**. Bike components are "only available on the Strava website", and "Bikes can only have a single component of any type". Reminders exist only for shoes | pricing "Updated: July 1, 2025"; support 2026-09-10 |
| WatchMy.bike | Tiers by bike count | Free: "Up to 3 bikes". Alloy: €3.25/month or €39/year (10 bikes). Carbon: €5.75/month or €69/year (50 bikes, 5 GB) | Free gets 3 photos per bike, 5 reminders and 5 documents. Strava, AI chat and export are on every plan | ©2026 |
| Velo Buddy (iOS) | Free + Premium | $4.99/month, $29.99/year, $29.99 lifetime | Free gets 1 bike. Premium: "Unlimited bikes and unlimited smart reminders" + AI | v1.4.5 |
| intervals.icu | Free + Supporter | $4 a month | "The core platform is free with no trials or time limits", gear included **[reasoning: not on the supporter list]** | – |
| Garmin Connect+ | Free core + an AI tier | A$12 a month or A$120 a year, 30-day trial | "All existing features and data in Garmin Connect will remain free." | 2025-03-28 |
| SRAM AXS, Shimano E-TUBE PROJECT Cyclist | Free companion apps, no in-app purchases | 0 | Firmware, battery and settings; no maintenance subscription | App Store |
| mainTrack (iOS) | Free + tip jar | $1.99–13.99 tips | Nothing | – |
| Hubtiger (B2B) | Workshop software | $52 / $99 / $125 a month | Number of technicians and SMS | – |

**Benchmark: RevenueCat, State of Subscription Apps 2026 (2025 data)**
- **Prices:** Health & Fitness "clusters at $39.94 yearly and $9.99 monthly".
- **Trials:** only 18.3 % of these apps run no trial at all, with "54% at 5–9 days".
- **Conversion:**
  - Trial-to-paid: "Health & Fitness median: 37.7%".
  - Download-to-paid by day 35: "median: 2.9%".
  - Across all categories, "Hard paywalls convert 5× better than freemium".
- **Web share:** web is "just 3.2% of total revenue globally".
- **Contradiction:** the report gives the Health & Fitness plan mix both as 68 % annual and as 68 % monthly.

**The norm [reasoning]:**
- Every tracker keeps logging, Strava sync and reminders free.
- Paid tiers sell bike count, storage, analytics and AI.
- Prices run about $25–40 a year, and nobody in this niche charges what Strava does.

---

## 3. Paywall design

### 3.1 Model options

| Option | Verdict | Why |
|---|---|---|
| Freemium subscription (monthly + yearly) | **Recommended** | Keeps the core loop free, as competitors do, and makes enthusiasts pay for what costs money (AI) or signals depth (bikes, profiles, storage) |
| Hard paywall | No | RevenueCat says it converts 5× better, but no tracker in §2 does it. It would also stop the free sharing (Reports, Public Profile) and the rider numbers the Strava review wants to see **[reasoning]** |
| Lifetime / one-time | Only as a capped founder offer | It doesn't pay for ongoing AI. Velo Buddy prices lifetime at one year's fee |
| Bike-count limit | **Yes, as the main fence** inside freemium | WatchMy.bike (3) and Velo Buddy (1) do it. It is easy to enforce on the server |
| Ads | No | Small Czech audience, consent banners, and it clashes with the UI **[reasoning]** |
| Supporter / tip jar | Fallback | No gating work at all, but low uptake (intervals.icu, mainTrack) **[reasoning]** |
| B2B Workshop plan via `organization` | Later | No UI yet, and it is a different product and price class (Hubtiger) |

### 3.2 Free vs Pro

| Area | Free | Pro | Why |
|---|---|---|---|
| Active bikes | 2 | Unlimited | A value fence; adding a third bike, or pairing new Strava gear to one, is a natural paywall moment **[reasoning]** |
| Parts, Services, Service Tracking (Interval Override, Muted, Plan), maintenance and plan pushes | ✓ | ✓ | The core loop. ProBikeGarage, Strava and intervals.icu keep it free |
| Strava sync, Unassigned Rides, ride check-in | ✓ | ✓ | The wear engine |
| Service history, History Totals, the Home cards shipped so far | ✓ | ✓ | Already shipped for free (M5) |
| Reports (all three kinds), PDF, Share Link | ✓ | ✓ | Every shared Report advertises the app, and a warranty document must not be held hostage |
| Public Profile, Follow | ✓ | ✓ | Network effect |
| Setup Profiles | 1 per bike | Unlimited | An enthusiast feature (Trail/Race/Park), cheap to fence |
| Service attachments | 20 files | Fair use (e.g. 5 GB) | ProBikeGarage sells 10 GB. R2 costs cents, so this is a value fence too |
| AI chat | 10 questions a month | Today's daily budget | The only variable cost (§1) |
| Coming: AI component recognition, cost per km, predictive intervals, a CSV export of history | – | ✓ | New value goes to Pro, so nothing old is taken away |
| AI review of a ride | ✓ | ✓ | Decided in #308: free on every plan (ADR 0044) |

**On downgrade:**
- Nothing is deleted or hidden, and anything over a limit keeps working. Only creating more is blocked **[reasoning]**.
- This leaves a loophole: subscribe for a month, add ten bikes, cancel. Accept it until someone abuses it.

### 3.3 Price and trial

**Price:**
- **Yearly 690 Kč / €27.99**, and **monthly 89 Kč / €3.49**. Yearly works out about 35 % below twelve months.
- **Why this level:**
  - It is below Strava (999 Kč) and between ProBikeGarage ($24.99) and WatchMy.bike Alloy (€39).
  - It is under RevenueCat's Health & Fitness cluster ($39.94), because BikeCheck does one job and sells mostly in CZ **[reasoning]**.
  - A monthly charge loses 10–30 % to fixed per-charge fees and VAT (§4.2), so lead with yearly.
- **Same price on web and Play:** Play may then net less. Google does "not require parity across platforms", but the app can't point at a cheaper web price anyway (§4.1) **[reasoning]**.

**Trial:**
- **Reverse trial:** 14 days of Pro from sign-up, derived from `users.created_at`, with no card and no store involved.
- **Store trial, later:** a 7-day trial on the yearly plan is worth an A/B test. Play trials can last "from 3 days to 3 years". Eligibility can be limited to users who "never had entitlement to this subscription".

### 3.4 What can't be paywalled

- **GDPR access (Art. 15) and portability (Art. 20).** Both must be "provided free of charge" (Art. 12(5)), and portability means data "in a structured, commonly used and machine-readable format". So a free export of the rider's own data must exist. A Pro "CSV for spreadsheets" can sit beside it **[reasoning]**.
- **Deleting an Account.** Play and Apple both require it (ADR 0028).
- **Cancelling.** On the web through the Stripe portal ("Cancel subscriptions immediately or at the end of the current billing period"); Play has its own.
- **Withdrawal**, and from 2027 its button, on direct web sales (§5.3).

---

## 4. Payments

### 4.1 Google Play, as of today

**When Play Billing is required:**
- In-app digital features, subscriptions included, must use Play Billing "unless Section 3, 8, or 9 applies". §8 and §9 are the opt-in programs below.
- Anti-steering: "apps may not lead users to a payment method other than Google Play's billing system". This covers "In-app webviews, buttons, links, messaging, advertisements, or other calls to action".

**Consumption-only, which is how a web purchase unlocks the app:**
- "Google Play allows any app to be consumption-only, even if it is part of a paid service": "a user could log in when the app opens and access content paid for somewhere else".
- The condition is that nothing "can be purchased from within the app".
- Telling users is allowed "without direct links", e.g. "You can purchase this book directly on our website".
- Outside the app, "you are free to communicate with your users about alternative purchase options".
- An app that sells through Play Billing **and** honours a web purchase is addressed by no Google text either way. The policy governs how purchases are made in the app, not where a purchase was made **[reasoning]**.

**Fees:**
- **Since 2026-06-30 in the EEA, UK and US:** auto-renewing subscriptions pay 10 % plus a "5% billing fee" when Play Billing is used, so 15 % as before.
- **Elsewhere:** 15 % until those markets migrate.

**EEA/UK billing choice program (since 2026-06-30):**
- You may offer alternative billing or an external link, but "You must offer users a choice of Google Play Billing alongside".
- Subscriptions then pay 10 %, with no billing fee.
- Every transaction must be reported "within 24 hours".
- The older external offers program needs a registered business and forbids Play Billing alongside.
- Not worth it at this size: it saves about 5 points, minus your own processor's 2–3 %, at the cost of a choice screen and a reporting API **[reasoning]**.

**US, after Epic (since 2025-10-29):** Play Billing is no longer required. Links and alternative billing are allowed "in lieu of or alongside Google Play Billing", and fees have applied since 2026-10-01. This is marginal for BikeCheck.

**Tax and payouts:**
- "Google is responsible for determining, charging, and remitting VAT" on EU purchases.
- The Developer Distribution Agreement: "Google is the merchant of record".
- In the EEA, content "is offered by Google Commerce Limited" (Dublin).
- Payouts arrive around the 15th of the following month.

**Prerequisites:**
- A personal account created after 2023-11-13 needs a closed test with at least 12 testers "opted in continuously for the preceding 14 days".
- Once a personal account monetizes, Play shows "your full address".
- Play's 2026-10-29 announcement: from November 2026 you "must declare your trader status in Play Console".
- New apps and updates need Play Billing Library 8 or later (deadline 2026-08-31, extendable to 2026-11-01).

### 4.2 Web: who is the seller

| Provider | Seller of record, VAT | Fee | Payout to CZ | Status |
|---|---|---|---|---|
| Stripe Billing (+ Tax) | You. Tax calculates, but filing goes through "third-party partners" | Card fees "1.5% + 6.50Kč" for EEA standard cards, 2.5 % for UK, 3.15 % international, + 2 % FX. Billing 0.7 %. Tax 0.5 % "where you're registered" | To a CZ bank: the first after 7 days, then 3 business days, with no payout fee | Sole proprietors accepted |
| Stripe Managed Payments | "SMP is the merchant of record" (Sold through Link, LLC). It covers VAT in 80+ countries and "regional cooling off periods" | "adds 3.5%" on the amount "including any indirect taxes", plus Billing | The same Stripe account **[reasoning]** | Generally available since 2026-04-22, **CZ supported**. Checkout and Payment Links only |
| Paddle | Paddle.com Market Limited (England & Wales), as a reseller | "5% + 50¢"; under $10, "contact us for bespoke pricing" | Monthly by the 15th, by wire or Payoneer, minimum $100 | Domain review needs pricing, terms and refund pages (search snippet only) |
| Lemon Squeezy | Sold through Link, LLC, the same entity as Managed Payments | "5% + 50¢" | CZ bank payouts, twice a month | Being folded into Managed Payments. The CEO admits "slower support responses and less frequent product updates" (2026-01-28) |
| Polar | "Polar is the Merchant of Record" | For organisations created since 2026-05-27, "5% + 50¢", + 1.5 % on non-US cards, + payout fees | Stripe Connect Express, CZ listed | – |

**What you keep of one sale to a Czech consumer [reasoning: the fees above, VAT at 21 %, and Play's fee assumed on the VAT-exclusive price]:**

| Route | 690 Kč a year | 89 Kč a month |
|---|---|---|
| Stripe direct, **neplátce** (no VAT) | 668 Kč (97 %) | 80 Kč (90 %) |
| Stripe direct, plátce (+ Tax) | 545 Kč (79 %) | 65 Kč (73 %) |
| Stripe Managed Payments | 524 Kč (76 %) | 62 Kč (70 %) |
| Paddle / Polar / Lemon Squeezy | about the same as Managed Payments | worse: the $0.50 fixed fee |
| Google Play Billing | 485 Kč (70 %) | 63 Kč (70 %) |

**Reading the table:**
- For a neplátce, VAT is the biggest line. A merchant of record (MoR) or store must charge 21 % that you otherwise wouldn't.
- For a plátce, Managed Payments costs about 3 points more than going direct, and buys all the VAT and consumer-law work.
- Managed Payments needs Checkout, so building on Stripe Checkout keeps both routes open **[reasoning]**.

### 4.3 Entitlement sync across web and Play

| | Your own NestJS | RevenueCat |
|---|---|---|
| Price | Your time | "Pay nothing for up to $2,500 in monthly tracked revenue", "Then pay 1%" |
| Web (Stripe) | Checkout plus a signed webhook. Small | Its Stripe integration (Managed Payments included) or its own Web Billing; "no additional RevenueCat fees" for web |
| Android | All of this is yours: **[a]** | `@revenuecat/purchases-capacitor` (Android, iOS) validates and acknowledges for you. Its webhook (retries "up to 5 times") feeds the same table |
| iOS later | A second store integration | The same SDK |

**[a]** What the Android row means without RevenueCat:
- A billing plugin. Capawesome Purchases is "only available to Capawesome Insiders" ($99 a month). cordova-plugin-purchase is MIT-licensed, but "you need a receipt validation server".
- Real-time developer notifications (RTDN) over Pub/Sub.
- `subscriptionsv2.get` as "the source of truth".
- Acknowledging "within three days", or the purchase is refunded.
- Handling grace and hold states.
- `obfuscatedAccountId` to tie a purchase to a rider.

**Recommendation:**
- **Web phase:** your own Stripe webhook, with no third party in the middle.
- **Play phase:** RevenueCat, whose webhook writes to the same `entitlements` table.
- Superwall (paywall A/B tests, free up to $10k a month) has only a community Capacitor plugin. Skip it.
- The local notes in `_frontend/bikecheck/.agents/skills/capacitor-plugins/references/` (`revenuecat-purchases.md`, `capawesome-purchases.md`, `capawesome-superwall.md`, `community-stripe.md`) were used as pointers only.

### 4.4 A later iOS build

**The rules:**
- **3.1.1:** "If you want to unlock features or functionality within your app, (by way of example: subscriptions…) you must use in-app purchase."
- **3.1.3(b):** web or Play purchases may be honoured, "provided those items are also available as in-app purchases within the app". So a consumption-only iOS app is not an option.

**Where it differs:**
- **US storefront:** buttons and links to the web are allowed. Whether Apple may take a commission on those purchases is still in court:
  - The Ninth Circuit held on 2025-12-11 that "the Company can charge some commission".
  - "On June 30, 2026, the Supreme Court granted the Company's petition."
- **Small Business Program:** 15 % up to "1 million USD in proceeds". You have to enrol.
- **EU:** alternative terms exist under the DMA; the default in-app purchase through the Small Business Program is the simple path **[reasoning]**. Apple will "publish this information on your App Store product page": the address, phone and e-mail of an EU trader.

---

## 5. Czech/EU tax and consumer law

### 5.1 VAT by route and status

| Route | Neplátce (OSVČ or s.r.o.) | Plátce |
|---|---|---|
| **Google Play** | You supply to Google Commerce Ltd (IE), so you become an **identifikovaná osoba** under §6i. Register within 15 days. File a souhrnné hlášení by the 25th after each month with sales. No CZ VAT is due, and the payouts are not CZ turnover | The same supply, reverse-charged in Ireland. It goes into the VAT return and the souhrnné hlášení |
| **MoR outside the EU** (Paddle: England; Managed Payments / Lemon Squeezy: "Sold through Link, LLC", country not stated) | A B2B supply outside the EU: no §6i, no souhrnné hlášení, not turnover **[reasoning]** | Reported as a supply abroad **[reasoning]** |
| **Stripe direct to EU consumers** | Below €10k of cross-border sales (this year and last) and below CZK 2M turnover: you charge no VAT, and the sales count toward the CZK 2M. Above €10k, destination VAT applies through OSS, which requires registering as plátce or identifikovaná osoba first | CZ 21 % below €10k. Destination VAT through OSS above it, or by opting in (binding for two years) |
| **Every route** | Buying taxable services from abroad for the business (Hetzner, OpenAI, Cloudflare…) makes you an identifikovaná osoba anyway (§6h) **[reasoning]** | – |

**The rules behind it:**
- **Store as supplier.** Implementing Reg. 282/2011 Art. 9a presumes a portal acts "in his own name". It cannot rebut that if it "authorises the charge to the customer … or sets the general terms and conditions". Google's agreement: "Google is the merchant of record", and "You may recognize a deemed supply from You to Google".
- **Identified person.** §6i: a neplátce "je identifikovanou osobou ode dne poskytnutí služby s místem plnění v jiném členském státě podle § 9 odst. 1" (becomes an identified person from the day it supplies a service taxed in another member state).
- **Plátce threshold.** §6(1): turnover over "2000000 Kč" makes you a plátce from 1 January, and over 2,536,500 Kč from the next day. Under §4a, only supplies "s místem plnění v tuzemsku" (taxed in CZ) count.
- **€10k rule.** Art. 59c: home-country VAT applies while the cross-border B2C total "does not in the current calendar year exceed EUR 10 000 … nor did it do so in the course of the preceding calendar year".
- **OSS.** Finanční správa: "Podmínkou registrace do režimu EU je registrace k DPH jako plátce nebo identifikovaná osoba" (you must first be a plátce or an identified person). Returns are quarterly.
- **Outside the EU.** Direct sales there (UK, CH, NO, US) were **not researched**. Keep direct checkout EU-only, or use Managed Payments **[reasoning]**.

### 5.2 OSVČ vs s.r.o.

- **VAT:** the rules above are the same for both.
- **OSVČ, flat-tax regime (§2a ZDP):** it requires that you are not a plátce "s výjimkou registrační povinnosti identifikované osoby" (identified person is allowed). Otherwise, 60 % flat expenses (§7(7)(b)).
- **s.r.o.:** "Sazba daně činí 21 %" (§21(1)).
- **Stores:**
  - A personal Play account shows "your full address" once it monetizes.
  - An organization account needs a D-U-N-S number and shows a phone number.
  - Apple publishes address, phone and e-mail for EU traders.
  - So the store listing makes the seller public either way.

### 5.3 Consumer law (direct web sales; on Play or with an MoR, they are the trader)

**The 14-day withdrawal right:**
- It runs 14 days from conclusion (Directive 2011/83 Art. 9; OZ §1829).
- A Pro subscription is a "digital service" (2019/770 Art. 2(2)(a)) **[reasoning]**, so the right does not end when the service starts. It ends only "after the service has been fully performed" (Art. 16(a)); the digital-content exception (Art. 16(m)) does not fit it.
- **Consent to start immediately:** if the consumer expressly asked to start now, withdrawing costs them "an amount which is in proportion to what has been provided" (Art. 14(3); OZ §1834). Without that request, it costs them nothing (Art. 14(4)(a); OZ §1836).
- **What checkout needs [reasoning]:**
  - An unticked box: "Start Pro now; if I withdraw within 14 days I pay for the days used".
  - A confirmation by e-mail.
  - Refunds paid pro rata.

**The withdrawal function:**
- Directive 2023/2673 adds Art. 11a, a button reading "withdraw from contract here" that applies from 19 June 2026.
- The CZ transposition came late: Act 159/2026 Sb. adds §1830a OZ, with "Odstoupit od smlouvy" and "Potvrdit odstoupení od smlouvy" buttons and a confirmation "v textové podobě" (in text form). It covers every contract "uzavřené distančním způsobem prostřednictvím on-line rozhraní" and is **effective 1 January 2027**.
- Consumers in other member states may already be covered by their own law **[reasoning]**.

**Play:**
- Declare subscriptions as "Service" in the EEA declaration: these are "eligible for a refund within 14 days of purchase".
- "For products classified as Digital Content, the right of withdrawal will be excluded", which does not fit a subscription **[reasoning]**.

**The reverse trial** sells nothing, so it raises no withdrawal question **[reasoning]**.

---

## 6. Terms and privacy: what must change before the first sale

These are in `terms.en.json`, and `terms.cs.json` mirrors them.

| Section | Today | Change |
|---|---|---|
| Opening, §28 Contact | The operator is just "BikeCheck", with only support@bikecheck.cloud | Name the seller: name, IČO and address **[reasoning: consumer information duties; CRD Art. 6 not re-read, §8]**. The stores publish them anyway (§5.2) |
| §6 Purchases and payment | "Visa, Mastercard, PayPal"; "All payments shall be in CZK"; "Sales tax will be added … as deemed required by us" | Say who sells on each channel (Google Play, Stripe or Stripe's MoR, or you). Prices in CZK and EUR, including VAT where it is charged. Payment methods as offered at checkout. Drop PayPal unless you offer it |
| §7 Subscriptions | "cancel … by logging into your account" | Android: cancel in Google Play. Web: Settings → Manage. Add the trial, renewal and price-change notices, and the downgrade rule (nothing is deleted; only going over a Free limit is blocked) |
| §8 Refunds | "All sales are final and no refund will be issued." | Contradicts the EU 14-day withdrawal right (§5.3). Replace it with the withdrawal right, the pro-rata rule and, from 2027, where the button is |
| §2, §9 | "personal, non-commercial use"; no "revenue-generating endeavour" | Only matters for a later Workshop plan |
| Privacy policy | – | Add the payment processor (Stripe, and later Google and RevenueCat) as a recipient |

---

## 7. Implementation sketch (a proposal: the new `billing` domain and a guard need your approval)

### 7.1 Data

```prisma
enum entitlement_source {
  manual // testers, founders, support fixes
  stripe
  play
  app_store
}

enum entitlement_status {
  active
  in_grace
  canceled // runs to ends_at, will not renew
  expired
  revoked
}

// One grant of Pro. A rider is Pro while a row is active, in grace or canceled and ends_at is null or ahead.
model entitlements {
  id          Int                @id @default(autoincrement())
  user_id     Int
  source      entitlement_source
  external_id String?            @db.VarChar // Stripe subscription id, RevenueCat original transaction id
  status      entitlement_status
  starts_at   DateTime           @db.Timestamptz(6)
  ends_at     DateTime?          @db.Timestamptz(6)
  will_renew  Boolean            @default(false)
  updated_at  DateTime           @updatedAt @db.Timestamptz(6)
  users       users              @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([source, external_id])
  @@index([user_id, ends_at])
}

// Webhook deliveries already applied, so a redelivery changes nothing. No payload: it carries personal data.
model billing_events {
  id          Int      @id @default(autoincrement())
  source      String   @db.VarChar
  event_id    String   @db.VarChar
  received_at DateTime @default(now()) @db.Timestamptz(6)

  @@unique([source, event_id])
}
```

**Also needed:**
- `users.stripe_customer_id String? @unique` and the `entitlements` back-relation.
- The trial is **not stored**: a rider is also Pro while `now < users.created_at + 14 days`. This is computed on read, in the spirit of ADR 0026.

### 7.2 Backend: `billing` (controller + service)

| Route | What it does |
|---|---|
| `GET /billing/me` | Plan, source, `ends_at`, `will_renew`, limits and usage. The app's one read |
| `POST /billing/checkout` | A Stripe Checkout Session for the monthly or yearly plan; returns the URL. Web only |
| `POST /billing/portal` | A Stripe Customer Portal session; returns the URL |
| `POST /billing/webhooks/stripe` | `@Public()`, raw body, `Stripe-Signature` checked. Upserts by subscription id. Needs `rawBody: true` in `main.ts` |
| `POST /billing/webhooks/revenuecat` (phase 2) | `@Public()`, shared secret in `Authorization`. Upserts with `source = play`, and re-reads `GET /subscribers` when in doubt |

**Gating:**
- `BillingService.isPro(userId)` and `assertWithinFree(userId, limit)`, with the limits as constants in `billing/plan-limits.ts`: `activeBikes: 2`, `setupProfilesPerBike: 1`, `attachments: 20`, `chatQuestionsPerMonth: 10`.
- **The gates live where things are created**, in the owning services:
  - Bike create in `bike.service` counts `is_deleted = false`. New Strava gear needs a bike created for it before it can be paired, so the same gate covers it **[reasoning]**.
  - Setup profile create in `setup.service`.
  - `uploadAttachment` in `bike-event.service`.
  - Asking in `ai-chat.service` counts the rider's own messages over 30 days.
  - Each throws `ForbiddenException({ code: 'PLAN_LIMIT', limit })`.
- Pro-only routes (later features) get a `pro.guard.ts` beside `_guards/user-throttler.guard.ts`.

**Also:**
- Deleting an Account (ADR 0028) must cancel a live Stripe subscription first, or Stripe keeps charging a deleted rider.
- M9 is done (#308): the enqueue is gone and the review is written on the first open.

### 7.3 Frontend: `features/billing/`

- **Files:** `billing.api.ts`, `billing.queries.ts` (`useBilling()`) and `billing.types.ts`. In `ui/`: `PaywallSheet.tsx` (a bottom sheet per `docs/conventions/drawers.md`, with dark tokens) and `ProBadge.tsx`.
- **How the sheet opens:** a 403 `PLAN_LIMIT` in `src/api/client.ts` opens it with the reason. That file has your uncommitted change, which was left alone.
- **Triggers:** a third bike (including pairing new Strava gear), a second Setup Profile, the 21st attachment, the 11th chat question, and any Pro-only feature.
- **Settings → "BikeCheck Pro":** status, renewal date, and Manage (the Stripe portal on the web; Play's subscription page in phase 2).
- **Native app in phase 1** (`Capacitor.isNativePlatform()`): the sheet says Pro is available on bikecheck.cloud, with no button, link or price (§4.1).
- Copy in cs and en.

### 7.4 Rollout order

| # | Step | Effort **[reasoning]** |
|---|---|---|
| 0 | Outside code: decide M6, register the business, get the Strava upgrade and review, take Play to production (12 testers × 14 days) | Weeks. Strava's review time is unknown |
| 1 | ~~Stop the Gemini ride summary (M9)~~ Done differently in #308 | – |
| 2 | The `billing` domain: schema, `GET /billing/me`, trial on read, the four gates, manual grants | 3–4 days |
| 3 | PaywallSheet, ProBadge, the Settings row, cs/en copy | 3–4 days |
| 4 | Terms §6–8 and the seller identity, privacy recipients, checkout consent | 1–2 days + an advisor |
| 5 | Stripe Checkout + Portal + webhook, direct or with Managed Payments | 3–5 days |
| 6 | Withdrawal button for direct web sales (due by 2027-01-01) | 1 day |
| 7 | Play Billing via RevenueCat and its webhook, once the app is public | 1–2 weeks |
| 8 | iOS (the same SDK + in-app purchase), the Workshop plan | Later |

Steps 2–3 can ship before any payment exists: manual grants let you test the limits on real riders.

---

## 8. Open questions / not verified

- **Play's fee base.** That Play's 15 % applies to the VAT-exclusive price is an assumption (§4.2); no page found says so.
- **Google entity.** Which Google entity pays a CZ developer: Google Commerce Ltd is indicated, not confirmed.
- **Fee invoices.** Whether the fees of Google, Stripe or an MoR are separate services that trigger §6h self-assessment.
- **Managed Payments entity.** Which country "Sold through Link, LLC" is registered in; the terms say only "LLC". It decides whether §6i applies to Managed Payments payouts.
- **Moving to Managed Payments.** Whether a running Stripe subscription can switch over without the rider subscribing again.
- **Direct sales outside the EU.** VAT and sales-tax rules for the UK, CH, NO and US were not researched.
- **Strava capacity.** Whether the app is past 10 riders yet (go-live D3/D6).
- **RevenueCat.** Which Play Billing Library version its Capacitor SDK ships, against Play's v8 rule, and whether web revenue counts toward its $2,500 threshold.
- **Paddle.** CZ onboarding is known from search snippets only.
- **Market gaps:**
  - No Play Store listing loaded, so there are no Play prices for competitors.
  - That Strava's gear features are free is inferred.
  - ProBikeGarage's Android price is unknown.
  - RevenueCat's Health & Fitness plan-mix figures contradict each other.
- **Apple's US link-out commission** is still before the Supreme Court.
- **CRD Art. 6** (the trader's information duties, e.g. identity and address) was not read: EUR-Lex refused automated fetches and `publications.europa.eu` stopped resolving. The other CELEX texts in §9 were read through it earlier in this research.
- **Gemini alias:** moot since #308 pinned `gemini-3.5-flash-lite` instead of `gemini-flash-latest`.

---

## 9. Sources (all fetched 2026-10-30)

| URL | Used for |
|---|---|
| https://www.probikegarage.com/#premium, https://www.probikegarage.com/help/strava-auto-sync.html, https://apps.apple.com/us/app/-/id1422489202 | ProBikeGarage prices, Premium contents, weekly vs daily sync, iOS upfront price |
| https://www.strava.com/pricing, https://www.strava.com/subscribe | Strava CZK prices, 30-day trial |
| https://support.strava.com/en-us/articles/15402143, https://support.strava.com/en-us/articles/15401878 | Bike components web-only, one per type; reminders only for shoes |
| https://watchmy.bike/pricing | Bike-count tiers and prices |
| https://apps.apple.com/us/app/-/id6747655084, https://apps.apple.com/us/app/maintrack/id1447308380 | Velo Buddy tiers; mainTrack tip jar |
| https://www.intervals.icu/pricing/ | Free core, $4 Supporter |
| https://www.garmin.com/en-AU/blog/?p=3346 | Connect+ price, 30-day trial, "will remain free" |
| https://apps.apple.com/us/app/-/id1430049231, https://apps.apple.com/app/id1176407871 | SRAM AXS and Shimano E-TUBE PROJECT Cyclist: free, no in-app purchases |
| https://hubtiger.com/pricing/ | Workshop software prices |
| https://www.revenuecat.com/state-of-subscription-apps/, https://www.revenuecat.com/state-of-subscription-apps-2025 | Health & Fitness prices, trials, conversion, web share |
| https://developers.openai.com/api/docs/pricing | gpt-4o-mini price |
| https://ai.google.dev/gemini-api/docs/pricing, https://ai.google.dev/gemini-api/docs/models | Gemini Flash prices and the 2027 rise; the "latest" alias |
| https://developers.cloudflare.com/r2/pricing/, https://resend.com/pricing, https://firebase.google.com/pricing | R2, Resend and FCM costs |
| https://www.strava.com/legal/api | API "at no charge", §3.2 (effective 2026-06-01) |
| https://support.google.com/googleplay/android-developer/answer/9858738 | Payments policy, anti-steering |
| https://support.google.com/googleplay/android-developer/answer/10281818 | Consumption-only, "without direct links", no parity |
| https://support.google.com/googleplay/android-developer/answer/112622, https://support.google.com/googleplay/android-developer/answer/16954621, https://android-developers.googleblog.com/2026/06/play-expanded-billing.html | 10 % + 5 % billing fee, regions, dates |
| https://support.google.com/googleplay/android-developer/answer/17161464, https://support.google.com/googleplay/android-developer/answer/12348241, https://support.google.com/googleplay/android-developer/answer/14372887 | Billing choice, the older EEA alternative billing, external offers |
| https://support.google.com/googleplay/android-developer/answer/15582165, https://support.google.com/googleplay/android-developer/answer/16497028, https://support.google.com/googleplay/android-developer/answer/16470497 | US after Epic |
| https://support.google.com/googleplay/android-developer/answer/138000, https://play.google/intl/en/developer-distribution-agreement.html, https://support.google.com/googleplay/android-developer/answer/7645364, https://support.google.com/googleplay/answer/6034670 | Google's VAT role, merchant of record, deemed supply, Google Commerce Ltd |
| https://support.google.com/googleplay/android-developer/answer/137997 | Payout timing |
| https://support.google.com/googleplay/android-developer/answer/14151465, https://support.google.com/googleplay/android-developer/answer/13628312, https://support.google.com/googleplay/android-developer/answer/18100766 | 12 testers × 14 days, what Play shows publicly, trader status from November 2026 |
| https://support.google.com/googleplay/android-developer/answer/10463498 | EEA withdrawal declaration: Service vs Digital Content |
| https://support.google.com/googleplay/android-developer/answer/12154973 | Trial lengths, offer eligibility |
| https://developer.android.com/google/play/billing/integrate, https://developer.android.com/google/play/billing/rtdn-reference, https://developer.android.com/google/play/billing/lifecycle/subscriptions, https://developer.android.com/google/play/billing/subscriptions, https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2 | Acknowledge within 3 days, RTDN, subscriptionsv2, obfuscatedAccountId, Billing Library 8 deadline |
| https://developer.apple.com/app-store/review/guidelines/ | 3.1.1, 3.1.1(a), 3.1.3(b) (revised 2026-10-16) |
| https://developer.apple.com/app-store/small-business-program/, https://developer.apple.com/support/apps-in-the-eu | 15 % program; EU terms (effective 2026-10-01) |
| https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements | EU trader details published |
| https://www.sec.gov/Archives/edgar/data/0000320193/000032019326000020/aapl-20260627.htm | US link-out commission litigation |
| https://stripe.com/cz/pricing, https://stripe.com/billing/pricing, https://docs.stripe.com/tax/supported-countries | CZ card and FX fees, Billing 0.7 %, Tax pricing and CZ support |
| https://support.stripe.com/questions/selling-on-stripe-without-a-separate-business-entity, https://docs.stripe.com/payouts, https://docs.stripe.com/customer-management | Sole proprietors, CZ payouts, portal cancellation |
| https://stripe.com/managed-payments, https://support.stripe.com/questions/managed-payments-pricing, https://docs.stripe.com/payments/managed-payments/eligibility, https://docs.stripe.com/payments/managed-payments/changelog, https://docs.stripe.com/payments/managed-payments/tax-compliance, https://docs.stripe.com/payments/managed-payments/how-it-works | +3.5 %, CZ supported, GA date, VAT coverage, cooling-off, Checkout only |
| https://stripe.com/legal/ssa-services-terms | Managed Payments entity, MoR, deemed supply (last modified 2026-09-28) |
| https://www.lemonsqueezy.com/pricing, https://www.lemonsqueezy.com/blog/2026-update, https://docs.lemonsqueezy.com/help/getting-started/supported-countries | Lemon Squeezy fee, direction, CZ payouts |
| https://www.paddle.com/pricing, https://www.paddle.com/legal/terms, https://www.paddle.com/help/manage/get-paid/when-and-how-do-i-get-paid | Paddle fee, entity, payouts (terms updated 2026-10-06) |
| https://polar.sh/docs/merchant-of-record/fees, https://polar.sh/docs/merchant-of-record/supported-countries | Polar fees, payouts |
| https://www.revenuecat.com/pricing/, https://www.revenuecat.com/docs/integrations/webhooks, https://www.revenuecat.com/docs/getting-started/installation/capacitor, https://www.revenuecat.com/docs/web/overview, https://www.revenuecat.com/docs/web/web-billing/tax, https://www.revenuecat.com/docs/web/integrations/stripe/stripe-managed-payments | RevenueCat price, webhooks, Capacitor SDK, web options |
| https://capawesome.io/plugins/purchases/, https://capawesome.io/insiders/, https://github.com/j3k0/cordova-plugin-purchase, https://www.iaptic.com/pricing, https://superwall.com/pricing, https://superwall.com/docs/community/capacitor | Other Capacitor billing plugins, Superwall |
| publications.europa.eu/resource/celex/02006L0112-20250414, …/02011R0282-20250414 | VAT Directive Art. 58, 59c; Implementing Reg. Art. 9a (EUR-Lex refused automated fetches) |
| https://vat-one-stop-shop.ec.europa.eu/one-stop-shop_en | OSS: who may register, quarterly returns |
| https://www.zakonyprolidi.cz/cs/2004-235 | ZDPH §4a, §6, §6h, §6i, §6j, §10i, §97, §101, §102 (version valid 2026) |
| https://www.financnisprava.gov.cz/cs/mezinarodni-spoluprace/mezinarodni-spoluprace-a-dph/one-stop-shop-oss/rezim-eu/registrace | OSS needs plátce or identifikovaná osoba |
| publications.europa.eu/resource/celex/02011L0083-20220528, …/32019L0770, …/32023L2673 | CRD Art. 9, 14, 16; "digital service"; withdrawal function and its dates |
| https://www.zakonyprolidi.cz/cs/2012-89, https://www.zakonyprolidi.cz/cs/2026-159 | OZ §1829, §1834, §1836, §1837; Act 159/2026 Sb., §1830a, effective 2027-01-01 |
| https://www.zakonyprolidi.cz/cs/1992-586 | ZDP §2a, §7(7), §21 |
| https://www.legislation.gov.uk/eur/2016/679/article/12/adopted, https://www.legislation.gov.uk/eur/2016/679/article/20/adopted | GDPR "free of charge", portability format |

**Repo files read:**
- **Product docs:** `CONTEXT.md`, `ROADMAP.md`, `FUTURE_FEATURES.md`, `docs/adr/0011`, `0012`, `0028`, `0041`, `0042`, `docs/deploy.md`, `docs/research/{go-live,hosting}.md`.
- **Monolith:** `_backend/apps/monolith/prisma/schema.prisma`, plus in `src/`:
  - `ai-chat/ai-chat.service.ts`, `ai-chat.controller.ts`
  - `gemini/gemini.{service,processor}.ts`
  - `strava/strava.{service,controller}.ts`
  - `storage/storage.service.ts`
  - `bike-event/bike-event.controller.ts`, `bike/bike.controller.ts`
  - `report/report.controller.ts`, `report-pdf.service.ts`
  - `mail/mail.service.ts`
  - `notification/{notification-types.config,push.service}.ts`
  - `organization/organization.controller.ts`
  - the `ride/`, `setup/`, `profile/`, `stats/` controllers
  - `ride/dto/response-ride.dto.ts`
- **Frontend:** `_frontend/bikecheck/{capacitor.config.ts,package.json,android/app/build.gradle,src/App.tsx,src/legal/terms.en.json}`, `.agents/skills/capacitor-plugins/references/*`.
- **Marketing website:** `_website_landing/index.html`.
