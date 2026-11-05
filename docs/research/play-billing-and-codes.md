# Google Play Billing and a code for Pro

*Research note, 2026-11-05. Branch `feat/ride-drawer-geist` @ `52731b8`. External sources fetched 2026-11-05.*
*Answers #350, a child of map #344. It builds on [`monetization.md`](monetization.md) and does not re-research what that file sources; §4 lists what this note changes there. **[reasoning]** marks an inference, not a sourced fact. Store rules change often, so re-check them before shipping. This is not legal advice.*

---

## 0. The short version

- **RevenueCat or direct:** RevenueCat. `@revenuecat/purchases-capacitor` 14.x ships Play Billing Library **9.1.0**, the newest release, and Play's minimum is **8**. Keep the Stripe webhook your own (§1.4).
- **The $2,500 threshold:** web revenue counts **only if RevenueCat tracks it**. A Stripe checkout you run yourself and never send to RevenueCat stays outside it **[reasoning]**.
- **Direct option:** two maintained free Capacitor plugins now exist, which `monetization.md` missed. They only cover the client: the server work stays yours.
- **A free code typed in the app:** allowed on the wording of the policy, which is triggered by "payment". No Google text mentions a developer's own codes, so this is a reading, not a permission (§2).
- **Play's own promo codes do not fit:** "Promo codes offer free trials to subscriptions and not free subscriptions". They need a payment method, renew into a paid plan and last 90 days at most (§2.3).
- **Pro from the web or a code, in an app that sells through Play:** no Google sentence says it outright, but no text forbids it, and Google's docs assume it: "maintains consistent user entitlements across all platforms" (§3).
- **The catch `monetization.md` missed:** the plain-text line "Go to our website to upgrade" is allowed only in a consumption-only app. Once the app sells through Play, it may not mention buying on the web at all (§3.2).

### 0.1 Your decisions (nothing below is decided)

| # | Decision | Recommendation | Why |
|---|---|---|---|
| B1 | Play integration | RevenueCat, SDK 14 or later | Free at this size, and it replaces the server work in `monetization.md` §4.3 **[a]** |
| B2 | Stripe and RevenueCat | Keep Stripe on your own webhook, not connected to RevenueCat | Nothing needs it there, and it keeps web revenue out of MTR **[reasoning]** |
| B3 | Code for testers and friends | Your own code, redeemed on the server, field in the app and on the web. Never sold | Play's codes cannot give free Pro. The web and the app share one grant |
| B4 | App copy once Play Billing ships | No mention of the web as a place to buy, no link to Stripe's portal | Payments policy §4 and its FAQ (§3.2) |

---

## 1. RevenueCat or direct Play Billing

### 1.1 Billing Library versions

**Play's rule:**
- "By Aug 31, 2026, all new apps and updates to existing apps must use Billing Library version 8 or later. If you need more time to update your app, you can request an extension until Nov 1, 2026."
- That extension ended four days ago, so **8 is the minimum today**.
- The deprecation table reads by the version being retired: v7 "August 31, 2026 / November 1, 2026", v8 "August 31, 2027 / November 1, 2027", v9 "August 31, 2028 / November 1, 2028". So 8 stays legal for new uploads until 2027-08-31 **[reasoning]**.
- The newest release is 9.1.0 (2026-06-18).

**What RevenueCat ships:**

| `@revenuecat/purchases-capacitor` | Released | `purchases-hybrid-common` | `purchases-android` | Billing Library | Status against Play |
|---|---|---|---|---|---|
| **14.1.0** (latest) | 2026-11-05 | 20.1.0 | 11.0.0 | **9.1.0** | Fine until 2028-08-31 **[reasoning]** |
| 14.0.0 | 2026-10-28 | 20.0.0 | v11 | 9.1.0 | The same |
| 13.8.0 | 2026-10-27 | 19.17.0 | 10.30.0 | 8.3.0 | Fine until 2027-08-31 **[reasoning]** |

- **The 14.0.0 changelog:** "This release updates the Android SDK to v11, which uses Google Play Billing Library 9.1.0 and requires Kotlin 2.1.0 and compileSdk 35. Capacitor, iOS and Android minimum OS versions do not change."
- **The migration guide:** "Capacitor 8 projects already meet both."
- **BikeCheck meets it:** `@capacitor/core` is `^8.4.1` (the SDK's peer is `>=8.0.0`), `compileSdk` is 36 and `minSdk` is 24 (`_frontend/bikecheck/package.json`, `android/variables.gradle`).
- **The CocoaPods warning in 14.0.0** only affects iOS, and there is no iOS project.

### 1.2 Does web revenue count toward $2,500?

**Only revenue RevenueCat tracks counts:**
- The definition: "It's the amount of revenue tracked by RevenueCat (in USD, and before the platform cut) during a one month billing period. This includes paid subscriptions, renewals, and one-time purchases."
- The billing docs: MTR "includes the revenue from all purchases and renewals including non-subscription products" and "is measured before store commission and taxes".

| How the web sale happens | Counts toward MTR? |
|---|---|
| RevenueCat Web Billing | **Yes.** "Purchases through Web Billing are subject to your usual RevenueCat fee (ie. 1% for Pro users earning $2,500+ in MTR)" |
| Stripe Billing through RevenueCat's integration, or your own checkout imported through "Track External Purchases" | **Yes [reasoning].** It is then tracked, and the Pricing FAQ names "moving subscriptions to less costly platforms like Stripe" as the reason MTR is taken before the platform cut. No page says it in so many words |
| Your own Stripe webhook, never sent to RevenueCat | **No [reasoning].** It is not tracked. Importing is something you opt into: "you can import those purchases into RevenueCat" |

**Reading it right:**
- `monetization.md` quotes "no additional RevenueCat fees" for web. That means no separate web fee; tracked web revenue still counts as MTR.
- Crossing the line bills 1 % of everything, not of the excess: "if you earned $2,600 in MTR in the previous billing cycle, you would incur a charge of $26". Falling back under it makes RevenueCat free again.
- Not paying restricts the dashboard (charts, customer lists, history). The listed abilities do not include the purchases themselves.

**How far away that is [reasoning]:** $2,500 is about 52,000 Kč a month at an assumed 21 Kč/$. That is 76 yearly sales at 690 Kč every month, or around 900 yearly payers tracked by RevenueCat.

### 1.3 Direct options on Capacitor

| Plugin | Licence | Latest | Billing Library | Note |
|---|---|---|---|---|
| `capacitor-plugin-cdv-purchase` (the Capacitor build of `cordova-plugin-purchase`) | MIT | 13.20.0, 2026-10-27 | 9.0.0 | "native implementations for both Capacitor and Cordova — no compatibility layer needed". Peer: Capacitor 6, 7 or 8 |
| `@capgo/native-purchases` | MPL-2.0 | 8.9.6, 2026-10-15 | 9.1.0 in `android/build.gradle` | "without a third-party payments service". v8.x is listed as actively maintained. Its README still says "Google Play Billing 7.x"; the build file wins |
| Capawesome Purchases | Paid | – | Default 8.2.0, can be overridden | "only available to Capawesome Insiders" |

**So a maintained direct option exists**, and for free. `monetization.md` §4.3 named only Capawesome and the Cordova plugin.

**What it does not change:** these plugins cover the client. Capgo's README tells you to "validate `purchaseToken` on your server with Google Play API". So everything in `monetization.md` §4.3 **[a]** stays yours: Pub/Sub notifications, `subscriptionsv2`, grace and hold states, and account linking.

### 1.4 Recommendation

**RevenueCat, on SDK 14 or later, for Play only:**
- It is free until about 900 yearly payers, and the money it saves is 1–2 weeks of server work and every later Play change **[reasoning]**.
- Use the BikeCheck user id as the App User ID. The default anonymous id is "not able to share subscription status across apps and platforms", while "A user logged into the same App User ID on different platforms will be considered the same user".
- RevenueCat's webhook writes to your `entitlements` table, as `monetization.md` §7 proposes. The app reads `GET /billing/me`, never RevenueCat's own state, because web and code grants live only in your table **[reasoning]**.
- Stripe stays on your own webhook.

**When direct would make sense:** if you do not want a third party holding purchase data, or you want no dependency at all. Then take a free plugin and budget for the server side.

---

## 2. A free code typed in the app

### 2.1 What the Payments policy says

- **The trigger is payment.** §2: "Play-distributed apps requiring or accepting payment for access to in-app features or services, including any app functionality, digital content or goods (collectively "in-app purchases"), must use Google Play's billing system for those transactions unless Section 3, 8, or 9 applies."
- **The feature itself is in scope when sold.** The examples include "new features not available in the free version". So the feature counts; what is missing is a payment.
- **§4 is about payment methods.** Apps "may not lead users to a payment method other than Google Play's billing system". A field that takes a free code leads to none **[reasoning]**.
- **The closest wording anywhere is about points.** From the policy FAQ: "Earned or awarded points can be issued in-app without using Google Play's billing system. Users can also exchange those earned or rewarded points in-app for digital goods and services without Google Play's billing system. However, keep in mind that if these points (or other types of virtual currency) are sold in-app, Google Play's billing system must be used."
- **Silence on codes.** The Payments policy, its FAQ and the Subscriptions policy contain no wording on a developer's own codes, coupons, vouchers or license keys. The only "gift card" entry is about selling them.

**Answer [reasoning]:** with no payment, §2 does not apply and Play Billing is not required. The points FAQ points the same way: digital goods handed out for no money need no Play Billing.

**Apple differs, and that is the useful contrast.** Guideline 3.1.1 says "Apps may not use their own mechanisms to unlock content or functionality, such as license keys, augmented reality markers, QR codes, cryptocurrencies and cryptocurrency wallets, etc." Google's policy has no such sentence. A later iOS build would have to drop or hide the field **[reasoning]**.

### 2.2 What is unclear

- **A direct statement.** No Google page says a free code may unlock paid features. Everything in §2.1 is a reading of what is written.
- **How review treats it.** No public text describes how a reviewer treats a code field. The reading could be tested by a rejection, not settled by a document.
- **What counts as "payment".** The policy does not define it. A code given to a friend or a tester is plainly free. A code given in return for something, such as a bike shop's customer or a paid event, is a greyer case.
- **Selling codes.** Not part of this plan. Once a code can be bought anywhere, the field may become a way round §2 or one of the "In-app promotions related to purchasable content" under §4 **[reasoning]**.

### 2.3 Play's own promo codes

**They do not meet the need:**

| Need | What Play's codes do | Meets it? |
|---|---|---|
| Free Pro | "Promo codes offer free trials to subscriptions and not free subscriptions." | No |
| No card | "A valid form of payment is required for the subscription, and the subscription will auto-renew at the end of the promo code free trial period." | No |
| Lasts as long as you decide | "a free trial of between 3 and 90 days" | No |
| Works on the web and belongs to the account | Redeemed in the app or the Play Store; the trial is a Play subscription **[reasoning]** | No |
| A small, closed group | A custom code's redemption limit "must be between a minimum of 2,000 and a maximum of 99,999", so a leaked code is good for at least 2,000 people **[reasoning]** | No |

The help page's opening line ("give users a free paid app, one-time product, or subscription") reads wider than this. The same page and the developer docs then narrow it to a trial.

**The limits, for the record:**

| | One-time use code | Custom code |
|---|---|---|
| **Count** | "10,000 promo codes per quarter per subscription product" | One code, with a redemption limit of 2,000–99,999 |
| **Redeemed** | "directly from the Google Play or in-app" | "Users can only redeem custom codes in-app." |
| **Who** | "New, current, or previous subscribers" | "New subscribers" only: "users who have not previously subscribed" |
| **Format** | Generated, downloaded as CSV | Alphanumeric, not case-sensitive, unique per app |

**For both:**
- "Promotions can last up to one year." Once a promotion's end date passes, "the promo code is expired".
- "Unused codes won't carry over to the next quarter."
- After creating a promotion you can't change its code count or type.
- "You must make eligibility criteria for promotions clear to your users."
- The app has to handle purchases made outside it, or the purchase is refunded after 3 days.
- Non-subscription promotions are capped at "500 promo codes per quarter" per app.

**Two workarounds, neither worth it:**
- **A one-time product with a promo code.** The item really is free ("at no cost"), but it needs an active buy option, so the product also sits on sale. It stays inside Play and does not reach the web **[reasoning]**.
- **License testers.** "Users in the testing tracks can also be license testers", but "test subscriptions can renew a maximum of six times" and a monthly plan renews every 5 minutes. That tests billing; it does not give anyone Pro.

### 2.4 Recommendation

**Your own server-side code**, as a grant on the account, with these limits **[reasoning]**:
- Never sold, and never described as something to buy. The field says "Have a code?" and nothing else.
- Limited redemptions and an end date on each code, so a leak costs little.
- The same `POST` from web and app, so Pro lands on the account either way.
- Keep the field out of the Play purchase flow. Settings is a good home.

**A safer fallback if review objects:** remove the field from the Android app and redeem only on the web, with the link sent by e-mail or chat. "Outside of your app, you are free to communicate with your users." Pro then reaches the app through the account (§3).

**Review:** "If your entire app or parts of your app are restricted based on login credentials, sign in details, memberships, location, or other forms of authentication, you must provide all required details to enable access to your app." Give the reviewer a test account that can reach Pro.

---

## 3. One app, three sources of Pro

### 3.1 What Google actually says

**No Google sentence states "an app selling through Play Billing may honour a purchase made on the web".** I searched the Payments policy, its FAQ, the Subscriptions policy, the program pages and the Play Billing docs. This is what exists, strongest first:

| Wording | Where | What it shows |
|---|---|---|
| "it's crucial to keep your backend up-to-date on the entitlements that users are purchasing. This is important for tracking purchases and managing other aspects of the user experience, such as cross-platform entitlements." | Purchase lifecycle and RTDNs | Google expects a Play-selling app to run entitlements across platforms |
| A backend that "maintains consistent user entitlements across all platforms" | The same page | The same. It speaks of purchases through your app, so the outward direction is explicit and the inward one is not **[reasoning]** |
| "If an app promotes the developer's in-app digital features or services that are available for purchase outside the app but does not offer an alternative billing system within the app or external web links, does the developer need to integrate the billing choice APIs?" Answer: "No" | Billing choice FAQ | In a program that keeps Play Billing alongside, Google treats in-app features "available for purchase outside the app" as normal. BikeCheck would not be enrolled, so this does **not** allow promoting them |
| "Outside of your app, you are free to communicate with your users about alternative purchase options. You can use email marketing and other channels outside of the app to provide subscription offers and even special pricing." | Payments FAQ | Promoting off-Play offers outside the app is allowed, with no condition about what the app sells |
| "Yes, you can email them or otherwise communicate outside your app about your offerings, even if they are different on Google Play." | Payments FAQ | The same, and it assumes the offering also exists on Google Play |
| "Yes. We do not require parity across platforms." | Payments FAQ | Different prices and channels are fine |
| "If your users can access subscription content outside of your app, they might discover that they have lost access on different surfaces." | Subscription lifecycle | One entitlement across surfaces is assumed |
| §2 "requiring or accepting payment ... must use Google Play's billing system for those transactions" | Payments policy | The rule governs transactions in the app, not where else an entitlement came from **[reasoning]** |

**Answer [reasoning]:** yes, Pro from the web or a code may be honoured beside Play Billing. A sale made off Play is outside §2, because the app took no payment, and showing Pro to a logged-in rider does not lead anyone to a payment method. `monetization.md`'s reasoning holds, and it now has wording behind it, though not a direct permission.

**Why "consumption-only" does not forbid it [reasoning]:** that FAQ allows a reader app: "a user could log in when the app opens and access content paid for somewhere else". It grants a right to apps that sell nothing. It does not say that apps which do sell lose the right to honour outside purchases. What they lose is the copy in §3.2.

**Fees:** the program fees attach to transactions "concluded outside the app following the external offer", "within 24 hours of following an external content link". A web purchase with no link from the app is not one of them **[reasoning]**.

### 3.2 What changes in the app once it sells through Play

**The plain-text line goes away:**
- The allowance is limited: "For services and products that are consumption only (apps that do not enable users to purchase access to digital goods or services from within the app), developers may choose to provide additional information about purchasing options without direct links".
- Everyone else is under the general rule: "This includes directly linking to a webpage that could lead to an alternate payment method or using language that encourages a user to purchase the digital item outside of the app."
- So "Pro is available on bikecheck.cloud" (`monetization.md` §7.3) works only before Play Billing ships **[reasoning]**. The launch order is still open in #344, so this applies to any phase with web sales but no Play Billing.

**What the Android app can and cannot do [reasoning, from §4 and the FAQ]:**

| Case | Do | Don't |
|---|---|---|
| Free rider hits the limit | Show the Play purchase only | Mention the web, its price or Stripe |
| Pro from the web or a code | Show that Pro is active and until when. Hide the Play purchase, which also prevents double billing | Link to checkout |
| Web subscriber wants to cancel or change a card | Handle it outside the app: Stripe's e-mails, or the web on its own | Link to the Stripe portal from the app without checking it: administrative pages are allowed only "as long as the webpage does not eventually lead to an alternate payment method" |
| Play subscriber wants to cancel | Deep link to the Play Store: "If applicable, you must also provide an option for users to cancel their subscriptions in your app and on your website." | – |
| Help, Terms and other links to your site | Keep them on pages with no route to checkout | Link to a page where pricing or checkout is one click away |
| Play Store listing | Describe the Play purchase | Mention web pricing: §4 lists "An app's listing in Google Play" |

**Price:** "In-app pricing must match the pricing displayed in the user-facing Play billing interface." Web prices may differ, but the app can't say so.

**The way out:** enrolling in the billing choice program would allow a link beside Play Billing, for a 10 % fee on subscriptions. It needs Billing Library 9.1, a choice screen and reporting "within 24 hours". `monetization.md` already judged it not worth it at this size, and nothing here changes that.

---

## 4. What this changes in `monetization.md`

Not edited, as asked. For whoever updates it:

| Where | Today | Now |
|---|---|---|
| §8 RevenueCat | Open question | Closed by §1.1 and §1.2 |
| §4.3 **[a]** | Direct means Capawesome or the Cordova plugin | Two maintained free options, including a native Capacitor build (§1.3) |
| §4.3 table | Web has "no additional RevenueCat fees" | True, but tracked web revenue counts as MTR (§1.2) |
| §4.1 | Honouring web purchases "is addressed by no Google text either way" | Still no direct sentence, but relevant wording exists (§3.1) |
| §4.1, §7.3 | The app may say so in plain text | Only while consumption-only (§3.2) |
| §4.1 | Billing Library 8, extendable to 2026-11-01 | The extension has passed; v9 is required from 2027-08-31 **[reasoning]** |

---

## 5. Open questions / not verified

- **Play review of a code field.** No public text and no first-hand report used. Only a real review settles it.
- **Stripe imported into RevenueCat counts as MTR.** Inferred from "tracked" and the FAQ wording; no page says so directly. The Pricing FAQ copy read here is a RevenueCat community post from 2021, because the FAQ answers on the pricing page did not load.
- **Google's own apps as evidence.** I tried to use them, since the FAQ says Google's apps follow the policy too. YouTube's help says "Billed through YouTube or Apple", with no mention of Play, and Google One's pages showed nothing clear. Neither is used here.
- **Country limits on developer promo codes.** Not stated on the developer pages. The consumer page's country rule is about discount coupons.
- **The Promo codes Terms of Service.** Shown only inside Play Console, so not read.
- **`capacitor-plugin-cdv-purchase` in practice.** Version, licence and Billing Library come from npm and the repo. Neither direct plugin was built or run.
- **RevenueCat 14 in this app.** The SDK requirements were checked against the build files, not by a build. 14.0.0 is 8 days old and 14.1.0 came out today.
- **Links in the Android app.** Which ones reach bikecheck.cloud, and whether those pages reach checkout, was not audited. The PRD needs this.
- **Stripe's Customer Portal.** Whether it counts as an "alternate payment method" when opened from the app. Treated as a risk in §3.2.

---

## 6. Sources (all fetched 2026-11-05)

| URL | Used for |
|---|---|
| https://support.google.com/googleplay/android-developer/answer/9858738 | Payments policy §2, §4, §6, §8, §9 |
| https://support.google.com/googleplay/android-developer/answer/10281818 | Payments FAQ: outside communication, consumption-only, parity, points, gift cards, administrative pages |
| https://support.google.com/googleplay/android-developer/answer/9900533 | Subscriptions policy: no wording on codes; a January 2027 change on eligibility discounts |
| https://support.google.com/googleplay/android-developer/answer/9934569 | Policy Deadlines: no Payments entry listed |
| https://support.google.com/googleplay/android-developer/answer/6321495 | Promo codes: types, limits, duration, comparison table |
| https://developer.android.com/google/play/billing/promo | "not free subscriptions", payment method, auto-renew, redemption flow |
| https://support.google.com/googleplay/android-developer/answer/9859455 | Access details for restricted parts of an app |
| https://support.google.com/googleplay/android-developer/answer/17161464 | Billing choice: requirements, fees, FAQ on features "available for purchase outside the app" |
| https://support.google.com/googleplay/android-developer/answer/14372887, https://support.google.com/googleplay/android-developer/answer/16470497 | Fees on transactions following a link, the 24-hour window |
| https://developer.android.com/google/play/billing/billingchoice | Billing Library 9.1 needed for the program |
| https://developer.android.com/google/play/billing/deprecation-faq | Version deadlines |
| https://developer.android.com/google/play/billing/outside-gpb-backend | The "version 8 or later" reminder, external transaction definition |
| https://developer.android.com/google/play/billing/release-notes | Billing Library 9.1.0, 2026-06-18 |
| https://developer.android.com/google/play/billing/lifecycle | "cross-platform entitlements", "across all platforms" |
| https://developer.android.com/google/play/billing/lifecycle/subscriptions | Access "on different surfaces" |
| https://developer.android.com/google/play/billing/manage-purchases | Cancel "in your app and on your website", deep links |
| https://developer.android.com/google/play/billing/integrate | Purchases made outside the app, 3-day refund |
| https://developer.android.com/google/play/billing/test | License testers, renewal times, six-renewal cap |
| https://support.google.com/googleplay/answer/15698521 | Consumer page on promotions and coupons |
| https://support.google.com/youtube/answer/9155410, https://support.google.com/googleone/answer/9003634 | Checked for Google's own apps; not used as evidence |
| https://developer.apple.com/app-store/review/guidelines/ | Guideline 3.1.1, own unlock mechanisms |
| https://github.com/RevenueCat/purchases-capacitor (`CHANGELOG.md`, `android/build.gradle`, `migrations/v14-MIGRATION.md`, GitHub releases), https://registry.npmjs.org/@revenuecat/purchases-capacitor/latest | SDK versions, dates, Billing Library, requirements, MIT licence |
| https://github.com/RevenueCat/purchases-hybrid-common (tag 20.1.0, `android/gradle/libs.versions.toml`) | Hybrid common to Android SDK mapping |
| https://github.com/RevenueCat/purchases-android (`gradle/libs.versions.toml` at 10.30.0, 11.0.0, 11.1.0, main) | Billing Library by SDK version |
| https://www.revenuecat.com/pricing/ | $2,500, 1 % |
| https://www.revenuecat.com/docs/welcome/set-up-revenuecat/account-management | MTR definition, billing example, what gets restricted |
| https://community.revenuecat.com/general-questions-7/pricing-faqs-112 | "What is MTR?", why before the platform cut |
| https://www.revenuecat.com/blog/company/introducing-revenuecat-billing | Web Billing counts toward the fee |
| https://www.revenuecat.com/docs/web/overview | "no additional RevenueCat fees" |
| https://www.revenuecat.com/docs/web/integrations/stripe, https://www.revenuecat.com/docs/web/integrations/stripe/track-external-purchases | Stripe integration, importing outside purchases |
| https://www.revenuecat.com/docs/subscription-guidance/subscription-offers/google-play-offers | Confirms promo codes are limited to a free trial |
| https://www.revenuecat.com/docs/customers/identifying-customers | App User IDs across platforms |
| https://github.com/j3k0/cordova-plugin-purchase (`README.md`, `plugin.xml`, `capacitor/android/build.gradle`), https://registry.npmjs.org/capacitor-plugin-cdv-purchase | Capacitor build, Billing Library 9.0.0, version, licence |
| https://github.com/Cap-go/capacitor-native-purchases (`README.md`, `android/build.gradle`, tag 8.9.6), https://registry.npmjs.org/@capgo/native-purchases | Billing Library 9.1.0, licence, maintenance, server validation |
| https://capawesome.io/plugins/purchases/ | Insiders only, default Billing Library |

**Repo files read:** `docs/research/monetization.md`, `_frontend/bikecheck/package.json`, `_frontend/bikecheck/android/variables.gradle`, `_frontend/bikecheck/android/app/build.gradle`.
