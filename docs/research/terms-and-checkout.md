# Terms and checkout

*Research note, 2026-11-05. Branch `main` @ `2f84a56`. External sources fetched 2026-11-05.*
*Answers #351, a child of map #344. It builds on [`monetization.md`](monetization.md) and [`play-billing-and-codes.md`](play-billing-and-codes.md) and does not re-research what they source; §9 lists what this note changes there. The plan is the one decided in #344: Free = first bike and 100 AI questions a month; Pro = 49 Kč (proposed €1.99) a month, no annual plan, no trial; the seller is a Czech sole trader, not a VAT payer. **[reasoning]** marks an inference, not a sourced fact. Quoted Czech law comes from zakonyprolidi.cz, not the Sbírka itself. This is not legal advice; §10 lists what needs a lawyer or a tax adviser.*

---

## 0. The short version

- **Who sells differs by route.** On the web the sole trader is the seller and carries everything below. On Play in the EEA the contract is with Google Commerce Limited, which handles withdrawal, refunds, VAT and receipts. Terms then only explain the split, the plan and how to cancel (§2).
- **Today's Terms cannot sell anything.** They name no seller, give no address or phone, forbid refunds in §8, point to a dispute platform that closed in 2025, and contain several clauses that are always unfair under Czech law. A Terms rewrite is needed, not a patch (§3).
- **The order button is the hardest legal risk.** It must say "Objednávka zavazující k platbě" or an equally clear phrase. If it does not, the contract is void or the consumer is not bound. Stripe's subscription label cannot be set by parameter, and the Czech text is unverified (§4.5).
- **14 days:** the right exists once, at the start. Renewals on unchanged terms do not restart it (CJEU *Sofatutor*). A new purchase after cancelling is a new contract **[reasoning]**.
- **Consent:** one unticked box, separate from accepting the Terms. Without it the rider pays nothing for the days used (§4.2).
- **Pro rata at 49 Kč:** about 1.63 Kč a day. A withdrawal on day 10 keeps 16.33 Kč and refunds 32.67 Kč. Stripe's fee of about 7 Kč is not returned (§4.3).
- **Withdrawal button:** §1830a OZ is effective **2027-01-01**, with a fine of up to 5 million Kč. Other EU states have had to apply the same rule since 2026-06-19, so build it before the first sale whatever the date. It is two steps, needs a confirmation e-mail, and Stripe offers no such feature (§4.7).
- **Cancelling online and renewal reminders:** no Czech or general EU rule for either. Germany and France do have a cancel-function rule, which may bind sales to their consumers. The Digital Fairness Act is expected in mid-November and no text exists yet (§5.3).
- **Privacy:** add Stripe, RevenueCat and Google, and fix two sentences that become false the day the first sale happens: "No purpose … longer than … you have an account" and "deleted … immediately and permanently" (§6).
- **Billing records outlive the account.** ADR 0028's hard delete needs an exception. The period follows the Czech tax-assessment period, 3 years from the filing deadline and up to 10 at most, so an adviser must set the number (§6.3).
- **Receipts:** a non-payer owes no VAT invoice to consumers. It owes a document on request, and Stripe can send one for every payment automatically (§7).

### 0.1 Your decisions (nothing below is decided)

| # | Decision | Recommendation | Why |
|---|---|---|---|
| T1 | Refund on withdrawal | Pro rata, per the statute | It is one calculation. A full refund lets a rider run Pro for free by buying and withdrawing on day 13, again and again **[reasoning]** |
| T2 | Contract shape | Indefinite duration, billed monthly, cancellable any time to the end of the paid month | Avoids French fixed-term renewal reminders, and reads simply. "Renews every month" stays true (§5.3) **[reasoning]** |
| T3 | Stripe's page or your own | Stripe Checkout, but test the label first. If the Czech label is not clearly a duty to pay, move to `ui_mode=elements`, where your page draws the button | §4.5 |
| T4 | Withdrawal button timing | Ship it with the first sale | Other member states already apply it; one code path for all EU riders **[reasoning]** |
| T5 | Seat address and phone | Decide what address and number go public | Both are mandatory on the web, and Play shows them too for a trader on an individual account. The address is the trade seat, so a home address becomes public |

---

## 1. Checklist before the first sale

"–" means nothing is needed from you on that route. Details and sources are in the section named.

### 1.1 Before any code

| Item | Web direct | Google Play | § |
|---|---|---|---|
| Trade licence, IČO, seat, published phone | Required | Required | 2 |
| Identified-person VAT registration | When you buy taxed services abroad (`monetization.md` §5.1) | Required on the first Play sale | – |
| Accept processor terms (Stripe DPA, RevenueCat DPA, Resend if used) | Stripe, Resend | RevenueCat | 6 |
| Trader declaration in Play Console | – | Required by **2027-02-01**, and at creation for new accounts | 2 |
| Product classified as **Service** in Play Console, not Digital Content | – | Required for the EEA | 2 |
| Lawyer pass on Terms and checkout text | Yes | Short check | 10 |

### 1.2 Terms

| Item | Web direct | Google Play | § |
|---|---|---|---|
| Seller block: name, IČO, seat, phone, e-mail, trade-register note | Required | Say Google Commerce Limited sells; keep your block as app provider | 3 |
| Plans, Free vs Pro, the daily AI cap | Required | Required | 3 |
| Locked Bike and rides lost, stated plainly | Required | Required | 3.3 |
| End of paid period, failed payment, price change | Required | Point to Play for payment and price change | 3 |
| Withdrawal section with model instructions and form, replacing §8 | Required | One paragraph pointing to Google | 4 |
| Complaints (reklamace) and legal guarantee | Required | Required: you handle support and complaints | 3 |
| ADR: ČOI with URL; delete the §19 platform text | Required | Keep it for contact with you **[reasoning]** | 3 |
| How the contract is concluded, languages, storage | Required | – | 5 |
| Codes | Required | Required | 3.4 |
| Remove always-unfair clauses (§5, §16, §17, §21–§25, §27) | Required | Required: you still contract as app provider **[reasoning]** | 3.2 |
| Notify current riders of the new Terms | Required | Required | 3.5 |

### 1.3 Privacy Policy and the delete page

| Item | Web direct | Google Play | § |
|---|---|---|---|
| Controller address and IČO | Required | Required | 6 |
| Billing data category, purposes, legal bases | Required | Required | 6 |
| Recipients and transfers | Stripe, Resend, adviser, tax office | Google, RevenueCat | 6 |
| Rewrite §7 retention and the delete page's "What is kept" | Required | Required | 6.3 |
| Play Data safety form | – | Declare purchase history; RevenueCat SDK data | 6 |

### 1.4 The checkout screen

| Item | Web direct | Google Play | § |
|---|---|---|---|
| At the start: accepted payment means; EU only | Required | – | 5 |
| Directly above the button: what Pro is, price per month, renews monthly, how to end, no minimum | Required | Disclose price, cycle and auto-renewal on your paywall | 5 |
| Button label with a duty to pay | Required, test it | Google's sheet | 4.5 |
| Unticked express-request box, stored with time and text version | Required | – | 4.2 |
| Terms acceptance, separate from that box | Required | – | 4.2 |
| Plain line on Locked Bike consequences | Required | Required | 3.3 |
| Consumers only: no VAT ID field, in Checkout or Portal | Required | – | 7 |
| Visible dismiss on the Unlock sheet | Good practice | Required by policy | 5.4 |

### 1.5 The e-mail after purchase

| Item | Web direct | Google Play | § |
|---|---|---|---|
| Own confirmation, sent **before** Pro starts | Required | – (Google's order mail) | 4.4 |
| Contains seller, plan, price, next charge, the express request, withdrawal instructions, model form | Required | – | 4.4 |
| Terms in text form, attached and not only linked | Required | – | 4.4 |
| Stripe receipt and invoice PDF for every payment | Turn on | – (Google) | 7 |
| Cancellation confirmation, with date of Locked Bike | Stripe's mail plus your own line | Own push or mail **[reasoning]** | 3.3 |
| Withdrawal acknowledgement in text form, with content, date and time | Required | – (Google) | 4.7 |
| Price-change notice | Required | Google notifies | 3 |

### 1.6 The app and the web app

| Item | Web direct | Google Play | § |
|---|---|---|---|
| Withdrawal button, two steps, reachable without hunting | Required | – | 4.7 |
| Cancel in Settings, via Portal or own button | Required | Link to Play's Subscription Center in Settings | 5.3 |
| Refund logic: cancel, partial refund, end Pro | Required | Handle the RevenueCat webhook | 4.3 |
| Hard-delete flow: cancel first, warn, keep billing records | Required | Warn that Google keeps billing unless cancelled; cancel through the API | 6.3 |
| Free data export reaching locked bikes | Required | Required | 3.3 |
| Seller name, seat, IČO on the website | Required | Required | 3 |
| Support replies within 3 business days | Good practice | Required by the Play agreement | 2 |

---

## 2. Who sells on each route

| | Web (Stripe direct, EU) | Google Play |
|---|---|---|
| **Contract with the rider** | You | EEA: "you will enter into a separate contract … with Google Commerce Limited" (Play Terms, EEA) |
| **Withdrawal** | You: statement, refund, button | The Terms say "you must inform Google Commerce Limited" |
| **Refund** | You, through Stripe | Google, and "Google may deduct the amount of those refunds from payments to You" (DDA 3.8) |
| **Receipts, VAT** | You, through Stripe | Google is merchant of record "acting as Your agent" for listed countries, the Czech Republic included |
| **Support, complaints** | You | You: "any complaints about Your Products", and paid-user queries "within 3 business days" (DDA 4.7) |
| **Compliance** | You | You warrant that, "as the principal to the transaction with the user, You are solely responsible for compliance worldwide" (DDA 11.3) |

**The catch:** `monetization.md` §5.3 says Google is the trader on Play. The consumer's contract supports that, but your agreement with Google calls you principal and Google your agent (DDA 3.4). So the rider's rights run against Google, while Google may pass any failure back to you **[reasoning]**. A lawyer should confirm this.

**Play's handling, which sets your settings:**
- "Service" in the declaration means a refund "within 14 days of purchase"; "Digital Content" excludes withdrawal, which does not fit a subscription (`monetization.md` §5.3).
- Google's refund page says digital services can be cancelled "within 14 days for a full refund". Its Terms say the rider "may be required to pay an amount in proportion". Expect the full refund, deducted from your payout **[reasoning]**.

**Trader status:**
- "all active developer accounts must declare whether they are a trader or non-trader" by **2027-02-01**. Missing it "may trigger enforcement including app update blocks and removal".
- For an individual account that is a trader, "a phone number and address will now be displayed".
- A paid app is a trade, so non-trader is not available **[reasoning]**: falsely creating that impression is "strictly prohibited".
- This refines `monetization.md` §4.1, which said only "from November 2026".

**Outside the EU** only Google sells. UK, US and other local consumer rules were not researched; Google is the merchant of record for the listed territories (§11).

---

## 3. Terms: clause by clause

These are in `terms.en.json`; `terms.cs.json` mirrors them. Under OZ §1812(2) and §1815 an unfair clause is simply disregarded, unless the consumer relies on it. So keeping one gains nothing and misleads the reader **[reasoning]**.

### 3.1 Must change for selling

| Section | Today | Change | Why |
|---|---|---|---|
| Opening | "between you … and BikeCheck"; only "support@bikecheck.cloud"; updates via "info@bikecheck.cloud" | Name the legal person: name, IČO, seat, phone, e-mail, and the trade-register note | OZ §1820(1)(b),(c), §435(1); CRD Art. 6(1)(b),(c). `privacy.en.json` already names Jaroslav Lufinka; the Terms do not |
| Opening | "The modified Legal Terms will become effective upon posting" | Notice period, and the right to refuse and terminate | OZ §1752(1) requires both for a valid change clause |
| §5 Products | "We reserve the right to discontinue any products at any time for any reason." | Paid Pro may change only with a fair reason, notice, and a right to cancel; refund the unused part if you stop | OZ §2389q (applied to services by §2389t), §1814(1)(e) |
| §6 Payment | "Visa", "Mastercard", "PayPal" | Payment means as offered at checkout. Drop PayPal: on Stripe it "Requires approval" | CRD Art. 8(3) |
| §6 | "Sales tax will be added to the price of purchases as deemed required by us." | The price shown is final. Neplátce: no VAT charged | OZ §1811(2)(c); CRD Art. 6(1)(e) |
| §6 | "All payments shall be in CZK." | 49 Kč; €1.99 outside CZ | Decided in #348 |
| §6 | "any applicable shipping fees"; "correct any errors or mistakes in pricing, even if we have already requested or received payment" | Delete | OZ §1814(1)(g),(h) |
| §7 Billing | "The length of your billing cycle will depend on the type of subscription plan" | One plan, monthly, charged at purchase and then every month until cancelled | OZ §1820(1)(o),(p) |
| §7 Cancellation | "You can cancel your subscription at any time by logging into your account." | Web: Settings. Play: Google Play's subscriptions. Effect at the end of the paid month | Play policy; `monetization.md` §6 |
| §7 Cancellation | "take effect at the end of the current paid term" | Add what happens that day, and on a failed payment (§3.3) | New plan rules |
| §7 Fee Changes | "will communicate any price changes to you in accordance with applicable law" | Say how far ahead, by what channel, and that the rider may cancel before it applies | OZ §1814(1)(h), §1752(1) |
| §8 Refunds | "All sales are final and no refund will be issued." / "Všechny prodeje jsou konečné a peníze se nevracejí." | Replace with the withdrawal section: 14 days, express request, pro rata, method, model form, button, and a note for Play | OZ §1812(2), §1820(1)(i)–(l); §4 here |
| §19 Disputes | "The European Commission provides information on consumer redress, including a list of dispute resolution bodies" | Name ČOI and its web address | ZOS §14(1), §20e(d). The ODR Regulation was repealed from 2025-07-20 |
| §28 Contact | "support@bikecheck.cloud" | Add seat and phone; say where to file a complaint | ZOS §13(1) |
| – (missing) | – | Plans and Locked Bike (§3.3), codes (§3.4), complaints, conclusion steps (§5) | – |
| §12, §26 | Apple Store text, California complaint unit | No effect on the first sale; trim when convenient | No iOS project |
| §3, opening | Minors need parental permission, while Privacy §8 says "at least 18" | Pick one rule, and say who may buy Pro | The two texts disagree **[reasoning]** |

**Complaints section:** state the rider's rights for a defective service, where to complain and how fast you answer. A complaint needs written confirmation and a written result, in a reasonable time for digital services (ZOS §13, §19(2), (3), (5); OZ §2389k–§2389m).

### 3.2 Unfair as written

| Section | Today | Problem |
|---|---|---|
| §16 | "WE RESERVE THE RIGHT TO, IN OUR SOLE DISCRETION AND WITHOUT NOTICE OR LIABILITY, DENY ACCESS … FOR ANY REASON OR FOR NO REASON" | OZ §1814(1)(d),(e): no free exit for the trader alone, and paid time cannot be kept. §1814(2)(a) presumes unfair a termination without good reason and fair notice |
| §17 | "We will not be liable … for any modification, price change, suspension"; "Nothing … will be construed to obligate us to maintain and support the Services" | OZ §2389c, §2389d(2): the service must stay free of defects with needed updates. §2389s(1) voids prior limits |
| §21 | "AS-IS AND AS-AVAILABLE"; "WE DISCLAIM ALL WARRANTIES" | OZ §1814(1)(a) |
| §22 | Liability capped at six months of payments | OZ §1814(1)(a). The closing "may not apply to you" does not fix it **[reasoning]** |
| §23, §24, §25 | Indemnity; "you hereby waive any right of action"; "You hereby waive any rights or requirements" | OZ §1812(2), §1814(1)(m) |
| §27 | "We may assign any or all of our rights"; "will not be construed against us" | OZ §1814(1)(p), §1812(1) |

### 3.3 Locked Bike

**Why it needs real attention:**
- It is a main characteristic of what the rider buys, so it belongs directly above the button as well as in the Terms (OZ §1820(1)(a), §1826a(1)).
- OZ §1753 makes a term the other side "nemohla rozumně očekávat" (could not reasonably expect) ineffective unless expressly accepted. Losing rides for good after a subscription lapses is a candidate **[reasoning]**. A plain line at the order step is the cheap protection.

**The Terms should say, in order [from #346 and #345]:**
- Free covers the first bike added. If it is archived or deleted, the oldest remaining bike is free.
- Without Pro every other bike is locked: greyed in the garage, with no detail, service, notifications, ride list or totals.
- This also applies after Pro ends: by cancelling, on a failed payment, on withdrawal, or when a code expires.
- Kilometres and wear do not count on a locked bike. Rides on it are lost unless the rider picks an unlocked bike in the check-in.
- After unlocking, wear leaves out the locked period and can read lower than reality.
- A locked bike gives no service reminders, so maintenance on it is the rider's own job **[reasoning]**.
- Nothing is deleted by locking, and the Strava pairing stays.

**What it may not do:**
- **Hide data.** Access and portability are free (`monetization.md` §3.4). If a locked bike's detail does not open, the free export must still contain it **[reasoning]**. No export route exists in the backend today; Privacy §13 sends riders to e-mail.
- **Keep content after withdrawal.** You must hand over the rider's content on request, free and in a common format (CRD Art. 13(6), (7); OZ §2389n(2)). Blocking Pro is allowed (Art. 13(8)), as is treating the rider as Free **[reasoning]**.

**AI claim:** Pro has no monthly limit but keeps today's daily cap (#345). "Unlimited" alone would be inaccurate. Write "bez měsíčního limitu, platí denní strop" and state the cap in plain terms (OZ §1820(1)(a); `ai-chat.service.ts:432`) **[reasoning]**.

### 3.4 Codes

| Point | Terms wording **[reasoning]** |
|---|---|
| Nature | A free grant of Pro on the account, never sold, no cash value, not transferable |
| Duration | Each code has an end date, which the rider sees when redeeming. Avoid "lifetime": promise a period or "as long as you hold the account" |
| After it ends | Back to Free, with no charge and no renewal. Locked Bike then applies |
| With a live subscription | Say what happens. Simplest: block redeeming during a paid subscription |
| Withdrawal | None: the CRD applies where "the consumer pays or undertakes to pay the price" (Art. 3(1)) |
| Abuse | You may end a code that was obtained by fraud or shared against its terms, with a reason |

Keep the copy consistent with `play-billing-and-codes.md` §2.4: never described as something to buy. Stripe's checklist also asks you to disclose "the conditions of any promotion".

### 3.5 Current riders

- The Terms promise "prior notice of any scheduled changes", and OZ §1752(1) makes a change clause depend on notice and a right to leave. So e-mail the new Terms before they apply, including to Free riders.
- This matters more here because the first sale locks every bike after the first for existing Free riders (#346), which reverses `monetization.md` M5 **[reasoning]**.
- No acceptance of the Terms is stored: `schema.prisma` has no such field. Purchases will record it through checkout; sign-up acceptance remains unproven. This is a gap, not a sale blocker **[reasoning]**.

---

## 4. The 14-day withdrawal right

### 4.1 What applies

- Pro is a digital service, and "service contract" includes one (CRD Art. 2(6)). A service that lets the consumer "create, process, store or access data" (2019/770 Art. 2(2)) is not digital content for Art. 16(m); the Court said so for a similar web service (C-641/19 *PE Digital*).
- So the right does not vanish when Pro starts. It ends only when the service "has been fully performed" (Art. 16(a); OZ §1837(a)), which a monthly plan never reaches within 14 days **[reasoning]**.
- The Czech Code's term is "služba digitálního obsahu" (§2389t). §1834 and §1836(a) speak of "poskytování služeb". Reading the first as included fits the CRD **[reasoning]**.
- 14 days from conclusion of the contract, no reason needed (OZ §1829(1), §1818). The rider meets the deadline by sending in time.
- If you fail to inform the rider, the period runs a further year (OZ §1829(4)) and the rider pays nothing for use (§1836(a)).
- Any unequivocal statement counts, so an e-mail to support is a valid withdrawal even when the button exists (OZ §1830(1)).
- The value does not matter. The Commission's guidance covers "low value subscription services (e.g. EUR 5 per month…)".

### 4.2 The consent

**The rule:**
- You may start in the 14 days only on an express request, and must warn that providing the service ends the right (OZ §1824a(3); CRD Art. 8(8)).
- It must be a positive act. "The use of a pre-ticked box or of a clause in the general terms and conditions for this purpose would not satisfy these requirements" (Commission guidance §5.6.1).
- Request and acknowledgement "can be expressed in one go".
- You are "not obliged either to offer this option or to accept the consumer's request".
- You bear the proof (CRD Art. 6(9); OZ §1839).

**Wording, built on the guidance's formula [reasoning]:**

> ☐ Chci, aby Pro začalo hned, ještě ve 14denní lhůtě pro odstoupení. Beru na vědomí, že když v této lhůtě odstoupím, zaplatím poměrnou část ceny za dny, kdy Pro běželo, a že po úplném poskytnutí služby právo odstoupit zaniká.

> ☐ I want Pro to start now, within the 14-day withdrawal period. I understand that if I withdraw in this period I will pay a proportionate part of the price for the days Pro was running, and that I lose the right to withdraw once the service has been fully provided.

**Mechanics:**
- `monetization.md`'s text lacks the acknowledgement of losing the right. Art. 8(8) requires it, so use the above.
- The box must not be the Terms box. Stripe gives one checkbox (`consent_collection.terms_of_service`), and custom fields offer text, dropdown and numeric only.
- So put the express request on your own sheet before the redirect, and store user id, time, text version and language. Keep Terms acceptance in Stripe, where `consent.terms_of_service` records `accepted` **[reasoning]**.
- Requiring the box to buy is the practical choice, since Unlock must work at once. The guidance's "not obliged" supports it, but no text says so directly **[reasoning, lawyer]**.

### 4.3 Pro rata at 49 Kč

**Rule:** the rider pays "poměrnou část sjednané ceny" (OZ §1834). The default is "pro rata temporis" on the price agreed (C-641/19, ruling 1). The guidance's example: 10 days costs "one third of the monthly subscription".

**Worked figures [reasoning: a 30-day period; use the real days in that period, count whole days, round for the rider]:**

| Withdrawn after | Rider pays | Refund | You keep after about 7.58 Kč of fees |
|---|---|---|---|
| 3 days | 4.90 Kč | 44.10 Kč | −2.68 Kč |
| 7 days | 11.43 Kč | 37.57 Kč | 3.85 Kč |
| 10 days | 16.33 Kč | 32.67 Kč | 8.75 Kč |
| 14 days | 22.87 Kč | 26.13 Kč | 15.29 Kč |
| Full refund instead | 0 Kč | 49 Kč | −7.58 Kč |

Fees are from `monetization.md` §4.2: 1.5 % + 6.50 Kč, plus 0.7 % Billing. "Stripe's processing fees from the original transaction aren't returned". Whether Billing's 0.7 % comes back is unverified.

**How it runs in Stripe:**
1. Cancel the subscription now, without proration credit. The Portal cannot do this step alone: it cancels, but "you can add the credit to their credit balance", and a refund to the card is a separate action.
2. Create a partial refund: `amount` in haléře on the PaymentIntent. It "can only be sent back to the original payment method", which satisfies OZ §1832(1).
3. Start it at once. You have 14 days from the withdrawal, and the rider sees it "approximately 5-10 business days later", so the clock is tighter than it looks **[reasoning]**.
4. A thin balance leaves the refund pending until funds arrive. Top up early on.
5. End Pro and write the record. Send the acknowledgement (§4.7).

**With no express request or no information,** the refund is 49 Kč in full.

### 4.4 The confirmation

- You must confirm the contract in text form "nejpozději … před tím, než začne poskytovat službu" (OZ §1824a(1); CRD Art. 8(7)). So the e-mail goes out before Pro switches on, not at some later point **[reasoning]**. In a webhook: send, then grant.
- You must also give the Terms in text form (OZ §1827(2)).
- A link will not do. The Court held that information reached "only via a hyperlink" is neither given nor received, and that such a website is no durable medium (C-49/11 *Content Services*, on the earlier Directive). Attach a PDF of the version accepted **[reasoning]**.
- Stripe's receipt does not carry this. Send your own mail. Resend is listed as a recipient then (§6).
- Include a copy of the express request. The duty to confirm consent is written for digital content (Art. 8(7)(b)), but proof falls on you anyway **[reasoning]**.

### 4.5 The order button

- **Text:** "Objednávka zavazující k platbě" "nebo jinou odpovídající jednoznačnou formulací" (OZ §1826a(2)). The CRD says only that wording or a corresponding one (Art. 8(2)).
- **Consequence:** "je smlouva neplatná, ledaže se jí spotřebitel dovolá" (invalid unless the consumer relies on it). The CRD: "the consumer shall not be bound".
- **Only the button's own words count,** not the surrounding text (C-249/21 *Fuhrmann-2*).
- **Stripe:** `submit_type` is documented "for one-time purchases", so subscriptions keep Stripe's own label. One developer report says German locale gives "Zahlungspflichtig abonnieren"; a second source differs. Nothing was found for Czech.
- **Do this first:** a sandbox session in `cs` and `en`, with a screenshot. If it is not clearly a duty to pay, use `ui_mode=elements`, where your site renders the Checkout elements **[reasoning]**. `monetization.md` says Managed Payments needs Checkout; check that this mode qualifies if you plan to move later.
- **Text above the button:** `custom_text.submit.message`, up to 1,200 characters with Markdown (§5.2).

### 4.6 Renewals

- **No new right on renewal.** The right "is guaranteed only once" where the consumer was clearly told what would be charged, and the consumer "cannot have such a right of withdrawal when that paid contract is extended for a fixed term either" (C-565/22 *Sofatutor*, paras 48, 51).
- **Conditions:** transparent information at the start, and no change of terms. The Court noted its file showed no "amendment of other terms" (para 43). If the information was not transparent, a new right arises (para 50).
- **A price rise on renewal** is therefore open. Treat it as possibly a fresh right, and give notice with the option to cancel **[reasoning]**.
- **A new purchase after cancelling or withdrawing** is a new contract with new 14 days **[reasoning]**. That is why T1 favours pro rata.
- **Say it in the Terms:** the right applies once, at the start.

### 4.7 The withdrawal button

**Dates:**

| | Rule | Applies |
|---|---|---|
| EU | CRD Art. 11a, added by Directive 2023/2673 | Member states apply it from **2026-06-19** |
| Germany (example) | BGB §356a, "Vertrag widerrufen" | Text is on the statute book |
| Czechia | OZ §1830a, added by Act 159/2026 Sb. | Published 2026-09-02; **effective 2027-01-01**. Čl. XII is the whole final part; no transitional clause |

- The Act's title speaks of financial services, but §1830a covers any distance contract concluded through an online interface where a withdrawal right exists. The Art. 11a recital says the duty applies "to all distance contracts".
- Sales to other member states' consumers before 2027 may fall under their law (Rome I Art. 6(2), and Terms §18 already says so) **[reasoning]**.
- Fine: ZOS §24 gains offences for not offering the button and not confirming, in a paragraph capped at 5,000,000 Kč; ePravo (2026-09-23) reads it the same way. ČOI enforces.
- The Act does **not** cover cancelling. Some secondary articles claim it does. The text has no "výpověď", and ePravo says the button is "pouze pro odstoupení".
- The separate "§5e" dark-pattern ban in the Act covers financial services only.

**What it must do (OZ §1830a; CRD Art. 11a):**

| Step | Requirement |
|---|---|
| First button | Label "Odstoupit od smlouvy" or an unambiguous equivalent. Shown prominently, easily reached, "dostupné nepřetržitě po celou lhůtu" |
| Statement | The rider can easily fill in or confirm name, the contract, and the e-mail for the acknowledgement |
| Second button | "Potvrdit odstoupení od smlouvy" or an equivalent. The first click alone does not withdraw |
| Acknowledgement | Without undue delay, in text form, with the content and the date and time of sending |
| Timing | Submitting before expiry is enough (Art. 11a(5)) |
| Information | From 2027 the pre-contract information must state the button and where it is (§1820(1)(i) as amended) |

**Design for BikeCheck [reasoning, except as cited]:**
- **Where:** Settings → BikeCheck Pro on the web, plus a link in the confirmation e-mail, in the Terms and in the web footer. The recital allows hyperlinks: "the trader could for example provide hyperlinks".
- **Login:** a logged-in rider "should be able to withdraw … without the necessity of providing once more their identification", so prefill. Freshfields reads the rule as forbidding a login barrier unless the contract itself needs an account. BikeCheck's does, but a rider locked out still needs a way: a public page with name, e-mail and invoice number costs little.
- **Android:** the consumer should not have to take steps "such as downloading an application if the contract was not concluded via that application". The web page serves web contracts. If you link it from the app, keep it on a page with no route to checkout (`play-billing-and-codes.md` §3.2).
- **Visibility:** keep the route always available. Mid-period logic then answers "your 14 days ended; here is how to cancel". An uninformed rider's period can run a year (§4.1).
- **No hurdles:** no reason field required, no retention offer in the flow (OZ §1818).
- **Effect:** the backend runs §4.3 and locks extra bikes. Show the rider the result on the confirm screen.
- **Stripe:** no feature found. Its German guide says nothing about a Portal function. The Portal's "Cancel" is not this.
- **Play:** the seller is Google, so the function is Google's. I found no Google page showing one (§11). Send Play riders to Google's refund page.

**Model form:** §1820(1)(i) and CRD Art. 6(1)(h) require the form too. Use `nařízení vlády 363/2013 Sb.`, parts (a) with the service text 2.3 and (b). Its text was not updated for the button: a filled-in model may not on its own cover the new item (§10).

---

## 5. Information duties

This closes the gap in `monetization.md` §8: CRD Art. 6 was read this time, in the consolidated text of 2022-05-28, along with its Czech equivalent. The Art. 6(1)(h) change from 2023/2673 was read in that Directive.

### 5.1 What must be given, and where

| OZ §1820(1) | CRD 6(1) | BikeCheck content | Terms | Checkout | E-mail |
|---|---|---|---|---|---|
| a | a | Pro: more than one active bike; AI without a monthly limit, daily cap stays; Locked Bike | ✓ | ✓ above button | ✓ |
| b, c | b, c | Name, seat address, **phone**, e-mail | ✓ | ✓ link | ✓ |
| e | e | 49 Kč or €1.99 a month, final; per billing period and per month | ✓ | ✓ above button | ✓ |
| h | g | Card through Stripe, charged at purchase and monthly; starts at once; complaints | ✓ | Payment means at the start | ✓ |
| i | h | Withdrawal terms, model form; from 2027 the button | ✓ | Link | ✓ in full |
| k | j | You pay the used part | ✓ | ✓ in the box | ✓ |
| l | k | When the right ends | ✓ | ✓ in the box | ✓ |
| m | l | Reminder of the legal guarantee | ✓ | – | ✓ |
| o | o | Duration, renewal, how to end | ✓ | ✓ above button | ✓ |
| p | p | No minimum beyond the paid month | ✓ | ✓ above button | ✓ |
| r | r, s | Browser or Android; internet; **rides arrive only through Strava** (`monetization.md` §1); no iOS app | ✓ | – | – |
| s | t | ČOI as ADR, with its web address; ČOI as supervisor | ✓ | – | ✓ |

**Not applicable:** (d) if the seat is the place of business, (f) automated price personalisation, (g) unusual call costs, (j) return costs, (n) codes of conduct, (q) deposits **[reasoning]**. Showing CZK to Czech riders and EUR to others is a market price, not a personalised one **[reasoning]**.

**The phone is mandatory.** Art. 6(1)(c) requires "the trader's telephone number and email address", and OZ §1820(1)(c) lists both. The Commission's 2021 guidance treats it as a plain item of the list. A number that nobody answers defeats "quickly and … efficiently" **[reasoning]**.

### 5.2 Rules on the order flow

| Rule | Source | BikeCheck |
|---|---|---|
| At the latest at the start of ordering: delivery restrictions and accepted payment means | CRD Art. 8(3) | "Karta. Jen v EU." on the first sheet **[reasoning: EU-only as the restriction]** |
| Directly before the order: (a), (e), (o), (p), clear and prominent | OZ §1826a(1); CRD Art. 8(2) | Text above the button, not behind a link. Suggested: "Pro: víc kol a AI bez měsíčního limitu. 49 Kč měsíčně, neplátce DPH. Obnovuje se každý měsíc, dokud ho nezrušíš; zrušit jde kdykoli k poslednímu dni zaplaceného měsíce. Po konci Pro se další kola zamknou a jízdy na nich se ztrácejí." **[reasoning]** |
| Button | OZ §1826a(2) | §4.5 |
| Stored contract? Languages? Steps? Error correction? | OZ §1826(1) | A short section in the Terms |
| Review and change input | OZ §1826(2) | Stripe's page lets the rider edit before paying; test it **[reasoning]** |
| Confirm the order | OZ §1827(1) | The e-mail |
| Same language as the contract | OZ §1811(1) | Czech and English. Art. 6(7) lets member states require their own language; not surveyed |
| Seller on the website | OZ §435(1), ZOS §14(1) | Footer or legal page: name, seat, IČO, register, ČOI. `_website_landing` has none today |
| Stripe's own review | Website checklist | Description, currency, contact, refund and cancellation policy, privacy, address |

**Stripe's page:** Dashboard Checkout Settings can show support contact, policy links and a refund policy block. It is a help, not a replacement: legal text must be seen, not sit in a dialog, for the Art. 8(2) items **[reasoning]**.

**Not needed:** the accessibility law excludes services from a micro-enterprise (Act 424/2023 Sb., §2(3)(a)). A sole trader qualifies **[reasoning]**.

### 5.3 Cancelling online, and renewal reminders

| Where | Online cancel | Renewal reminder |
|---|---|---|
| **Czechia** | No rule. Act 159/2026 covers withdrawal only. General unfair-terms rules still apply | No rule found: a text search of OZ and ZOS for automatic extension gives only §1814(1)(i), which bars far-off refusal deadlines, and the information duties |
| **EU** | None in force. The CRD "only sets out information requirements regarding the termination and extension of contracts" (guidance §3.2.7) | None. The Digital Fairness Act is expected in mid-November 2026, with no text yet. Reported ideas are click-to-cancel and renewal reminders, and they are years from applying |
| **Germany** | BGB §312k: a website button "Verträge hier kündigen", a confirmation page, "jetzt kündigen", always available, with an instant confirmation. Without it the consumer may terminate at any time without notice | Not surveyed |
| **France** | Art. L215-1-1: a free electronic function, Art. D215-1 "résilier votre contrat", directly reachable | Art. L215-1: for fixed-term contracts with tacit renewal, written notice 1–3 months before the deadline; otherwise the consumer may leave free at any time |
| **Google Play** | Required in the app: a link to the Subscription Center in account settings. "Monthly subscriptions that do not inform users they will be automatically renewed and charged every month" are a violation | Google applies a price rise only after "at least 30 days' prior notice" (Play Terms, EEA) |

**What that means [reasoning]:**
- Consumers elsewhere keep their home mandatory rules if you direct your activity there (Rome I Art. 6). Euro prices and an EU-wide checkout point that way.
- Only Germany and France were looked at; other states may have rules.
- A low-cost answer covers both: a plain "Cancel subscription" on the web, two steps, with an instant e-mail. Settings can host it, using `cancel_at_period_end=true`. Whether the German rule allows it behind a login is a lawyer question.
- T2 keeps the French reminder out of play, since L215-1 speaks of fixed-term contracts.
- Stripe's "Send emails about upcoming renewals" is a free extra, and useful to reduce disputes. It is not a legal need at this price and cycle.

### 5.4 Play paywall (from `play-billing-and-codes.md`, plus the Subscriptions policy)

- "clearly and explicitly disclosing your offer terms, the cost of your subscription, the frequency of your billing cycle".
- Promotions must show the content can be used without a subscription where that is possible; "A missing or hard-to-see dismiss button" is a violation. The Unlock sheet needs a clear close **[reasoning]**.
- Locked Bike copy is the same on both routes. Web-only copy stays out of the app (`play-billing-and-codes.md` §3.2).

---

## 6. Privacy Policy and billing records

### 6.1 Recipients

| Recipient | Role | What it gets | Transfer | Source |
|---|---|---|---|---|
| **Stripe** | Processor for payments; controller for its own purposes such as fraud prevention and legal compliance | Name, contact and billing details, card details, amount, date, status, refunds, IP and device data for fraud | US; DPF, EEA SCCs | Stripe Privacy Policy (2026-01-16), DPA (2026-09-28) |
| **RevenueCat** | Processor | BikeCheck user id and purchase data. Do not set `$email` **[reasoning]**. `$ip` exists as a device attribute | US; SCCs. The DPA does not mention DPF | DPA (August 2026) |
| **Google (Play)** | Seller to the rider, so its own controller **[reasoning]** | Everything in the purchase. You receive order and token data only | Google's own | Play Terms, DDA 9 |
| **Resend** | Processor, if it sends the purchase mail | E-mail, plan, invoice data | Not checked | §4.4 |
| **Tax adviser, tax office** | Recipients by duty | Invoices | CZ | [reasoning] |

**Per `play-billing-and-codes.md` B2,** Stripe is not connected to RevenueCat, so RevenueCat holds only Play data. If that changes, this table changes.

### 6.2 Changes to `privacy.en.json` and `.cs.json`

| Section | Today | Change |
|---|---|---|
| Opening | "for Jaroslav Lufinka" with an e-mail | Add seat and IČO (GDPR Art. 13(1)(a)) |
| Summary, §3 | Providers list ends at logging | Add §6.1 |
| §3 | Third parties process "only on our instructions" | False for Stripe's own purposes and for Google. Split processors from independent recipients |
| §1 | No payment data | New "Billing data": name, e-mail, country or address, plan, price, dates, invoice numbers, card brand and last four as shown by Stripe, refunds, express request, withdrawal statements, Play order data. "We never see your full card number" **[reasoning]** |
| §2 | No payment purpose | Purposes and bases: payment and subscription (contract); tax records (legal obligation); fraud, defending claims (legitimate interests) |
| §6 | "in particular OpenAI, Google and Cloudflare" | Add Stripe, RevenueCat |
| §7 | "No purpose in this notice will require us keeping your personal information for longer than the period of time in which you have an account with us." | **False after the first sale.** Replace it |
| §7 | "deleted from our database immediately and permanently" | Add the billing exception (§6.3) |
| §9 | Mentions automated decisions | A note that a payment can be stopped by automated fraud checks **[reasoning]** |
| `delete-account` | "WHAT IS DELETED" lists everything; "WHAT IS KEPT" has only the anonymous record, backups, logs | Add billing records and period; explain that a running subscription is cancelled, and that a Play subscription is handled as below |

**Play:** Data safety must reflect SDK data "irrespective of whether data is transmitted to you or a third-party server". You need not declare card data the payment service collects if your app "never accesses this information", but you "should also consider whether your app collects … purchase history". The account-deletion policy allows keeping data for "regulatory compliance" if you "clearly inform users about your data retention practices".

### 6.3 What ADR 0028 must give way on

**The conflict:** ADR 0028 says "Deleting an Account destroys the `users` row", with everything hanging off it. `monetization.md` §7.1 proposes `entitlements` with `onDelete: Cascade`. Both are fine for *state*, but not for *evidence*.

**The legal basis:** erasure does not apply where processing is needed "for compliance with a legal obligation" or "for the establishment, exercise or defence of legal claims" (GDPR Art. 17(3)(b),(e)).

| Record | Why kept | How long |
|---|---|---|
| Invoices and payment records (web) | Income tax proof | Until the tax-assessment period ends: ZDP §7b(5), Tax Code §97(5). That is 3 years from the filing deadline (§148(1)), extended by events, **10 years at most** (§148(5)). So about 4–5 years in the normal case **[reasoning]** |
| Purchase documents you receive as an identified person | VAT | 10 years (ZDPH §35(1)(b), (2)). Mostly supplier invoices, not rider data |
| OSS records, if you ever register | VAT | 10 years from the end of the calendar year (ZDPH §110f(2)(a)) |
| Express request, Terms version, withdrawal statements | Your burden of proof; claims | 3-year limitation (OZ §629(1)), so about 3–4 years from the end of the contract **[reasoning]** |
| Play purchases | Google holds them | Keep monthly earnings reports for your own tax. No rider-level file needed **[reasoning]** |

**The answer in short:** no flat statute fixes one number for a non-VAT sole trader. Keep only billing records, and let the tax adviser pick the figure. If you want a single rule now, 10 years is the longest the assessment rule reaches, but it is harder to justify as minimal under GDPR **[reasoning]**. Privacy may state criteria rather than a number (Art. 13(2)(a)).

**How to build it [reasoning; a new table needs your approval]:**
- A small table with **no foreign key** to `users`: Stripe customer and invoice ids, date, amount, currency, consent version and time, withdrawal record. No bike or ride data.
- Or rely on Stripe's export: a monthly CSV to the adviser, with Stripe as the store. The consent proof still needs a home.
- ADR 0028 needs a follow-up ADR: "billing records survive deletion".

**Account deletion flow:**

| Case | What to do |
|---|---|
| Live Stripe subscription | Cancel first. `DELETE /v1/customers/{id}` "immediately cancels any active subscriptions" and removes card details, while "deleted customers can still be retrieved" for history. Whether invoices stay listed was not tested; check in a sandbox |
| Inside the 14 days | Offer withdrawal first. Deleting an account is not plainly an "unequivocal statement" of withdrawal, so ask **[reasoning]** |
| After the 14 days | No refund of the remaining days, if the Terms say so and the rider is warned on the deletion sheet **[reasoning]** |
| Play subscription | Deleting a RevenueCat customer "clears out all of their data" but does not cancel the store subscription. RevenueCat's doc says you can cancel a Google Play subscription through its API before deleting. Log out of the SDK, or the customer is re-created |
| Disclosure | The sheet in ADR 0028 counts what will go; add "what stays" |

---

## 7. Receipts for a sole trader not paying VAT

**What the law requires:**

| Rule | Text | Effect |
|---|---|---|
| VAT invoice | ZDPH §28(1): "Plátce je povinen vystavit daňový doklad"; §28(3) covers supplies to taxable persons in another member state | None for a consumer sale by a non-payer **[reasoning]**. A sale to a business in another EU state would trigger one, so stay consumer-only |
| Consumer document | ZOS §16(1): "Na žádost spotřebitele" a document with date, what was supplied, price, and the seller's name and IČO | On request. Not a duty to send one each month |
| Receipt of payment | OZ §1949(1): a kvitance "na jeho žádost" with both names, subject, place and time | On request |
| Business documents | OZ §435(1): name, seat, the register entry, identifying number | On anything you issue |
| Sales records | EET | Repealed from 2023-01-01 (458/2022 Sb.) |
| Your own records | ZDP §7b, or the flat-tax regime with limited records (§7a(8) for mixed income) | Depends on your tax regime. Adviser |

So "a receipt for each monthly payment" is not strictly required, but sending one automatically removes every request **[reasoning]**. It also fulfils ZOS §16 ahead of time.

**Stripe can do it:**
- "Stripe creates receipts for all successful payments and refunds, including invoice payments and recurring payments as part of a subscription", and "For subscriptions, Stripe generates invoices automatically."
- Turn on **Settings → Business → Customer emails → Successful payments**. The mail then attaches both the invoice and the receipt PDF. In test mode no automatic mail goes out.
- Receipts always need "Legal business name, Customer support address, Customer support email, Privacy policy URL".

**Set up [reasoning, using the options cited]:**

| Setting | Value |
|---|---|
| Public business details | Your name, seat, support e-mail, phone |
| Invoice footer | "IČO …. Zapsán v živnostenském rejstříku. Neplátce DPH." The note is not legally required; it prevents questions |
| Numbering | Account-level sequence. Stripe says EU states "typically require" it |
| Language | `preferred_locales` = `cs` or `en`. Czech is supported for invoices, receipts and the Portal |
| Stripe Tax, tax IDs | Off. Nothing that shows a VAT line. Whether to show your DIČ after registering as an identified person is an adviser question |
| Customer tax IDs | Disable in Checkout and in the Portal, which otherwise lets customers "Update billing information, including their tax IDs" |
| Refunds | Turn on **Refunds** receipts. Consider a credit note on the invoice |

**Stripe's limit:** "You're responsible for verifying that the invoices you issue meet local tax requirements."

**Other points for the adviser:** income is the 49 Kč charged, not the payout **[reasoning]**. EUR sales need a CZK rate. The €10k and 2M Kč watch (#349) needs a running total, and Stripe's export can feed it.

**Play:** Google sells, charges VAT and issues the buyer's documents. You issue nothing to the rider, and keep Google's earnings reports. VAT treatment is in `monetization.md` §5.1.

---

## 8. Order of work

1. Sandbox test of the button label in `cs` and `en` (§4.5). It decides T3 and so the screen design.
2. Decide T1, T2, T5.
3. Lawyer drafts Terms, Privacy, withdrawal text from §3, §4 and §6.
4. Build: express request, confirmation mail with PDF, withdrawal page, refund logic, cancel, billing records.
5. Stripe settings from §7.
6. E-mail current riders with notice before Terms apply.
7. Play Console: Service tag, trader declaration, Data safety.

---

## 9. What this changes in the earlier notes

Not edited, as asked.

| Where | Today | Now |
|---|---|---|
| `monetization.md` §8 | CRD Art. 6 not read | Read (§5.1) |
| §5.3 | Unticked box: "Start Pro now; if I withdraw within 14 days I pay for the days used" | Lacks the acknowledgement Art. 8(8) requires (§4.2) |
| §5.3 | "on Play or with an MoR, they are the trader" | Holds for the rider's contract; DDA 11.3 still calls you principal (§2) |
| §5.3 | Consumers elsewhere "may already be covered" | Supported: Directive date, and the BGB §356a text (§4.7) |
| §4.1 | Trader status "from November 2026" | By 2027-02-01; phone and address shown for a trader on an individual account (§2) |
| §6 | Add "trial", "nothing is deleted", "Stripe's MoR" | No trial. Locked Bike replaces the downgrade rule. Direct seller decided |
| §6 | Terms table | Much longer list (§3) |
| §7.1 | `entitlements` cascades on user delete | Keep, but billing evidence needs a separate store (§6.3) |
| §7.2 | "must cancel a live Stripe subscription first" | Still right; also cover Play and the 14 days (§6.3) |
| §7.4 | Withdrawal button "due by 2027-01-01" | Ship with the first sale (§4.7) |

---

## 10. For a lawyer or tax adviser

**Lawyer:**
- The whole rewritten Terms and Privacy. §3 finds the problems; it is not draft text.
- The button label if it is anything other than the statutory words.
- Whether a mandatory express-request box is fine.
- Whether a filled-in model instruction still gives the §1820(2) protection without the button (§4.7).
- Whether OZ §1834 covers "služba digitálniho obsahu" as this note reads it.
- Pro rata mechanics: how to count days, and whether the first day counts.
- A rider-friendly reading of §1753 for rides lost.
- The DDA 11.3 exposure on Play.
- T2's contract shape.
- Which other EU states' rules bind you, especially §312k without login, and languages.
- Refund or not when deleting an account in a paid month.

**Tax adviser:**
- The retention number (§6.3).
- Invoice text for a non-payer with a DIČ as identified person.
- Records under the flat-tax regime, gross vs net income, EUR conversion.
- Any sale to a business in another EU state.
- Everything already flagged in #349: secondary income, social payments.

---

## 11. Open questions / not verified

- **Stripe's Czech button text.** Not seen; no account was used. One German developer report only.
- **`ui_mode=elements`.** Taken from the API enum. Not built; whether all checkout rules and Managed Payments fit it is unverified.
- **Stripe's invoices after deleting a customer.** Inferred from "track their history".
- **Billing's 0.7 % on a refund.** Unverified.
- **Google's withdrawal function.** No Google page describing an Art. 11a button on Play was found, and no June 2026 announcement. Play's refund policy points to a withdrawal form; Google's own hardware store has a separate flow.
- **Commission guidance** dates from 2021, before Art. 11a. No official Art. 11a guidance or FAQ was found; login and "prominently displayed" rest on the recital and on law-firm commentary.
- **MPO or ČOI guidance on §1830a.** None found. ePravo and Freshfields are secondary.
- **Fine ceiling.** Read from the current ZOS §24 and the Act's renumbering, plus ePravo; the renumbered text was not seen consolidated.
- **Digital Fairness Act.** The mid-November date comes from a law-firm article citing a Parliament briefing; another source says 11 November. No text exists. Re-check once published.
- **Germany's and France's rules** were read only in part: §312k and §356a directly; the French articles through search extracts of Légifrance. Applicability to a Czech seller is **[reasoning]**. Other member states were not surveyed.
- **The Czech Act's text** is from zakonyprolidi.cz, not the Sbírka PDF.
- **Consumer law outside the EU** for Play sales: not researched.
- **Resend's** data terms and location: not checked.
- **ČOI for cross-border riders.** ZOS §20d covers disputes with supply in CZ or tied to business here; the ČOI page says nothing specific.
- **`_website_landing`** was searched only for the seller's name, IČO and address; none found.

---

## 12. Sources (all fetched 2026-11-05)

| URL | Used for |
|---|---|
| publications.europa.eu/resource/celex/02011L0083-20220528 | CRD consolidated: Art. 2, 3, 6, 8–16 |
| publications.europa.eu/resource/celex/32023L2673 | Directive 2023/2673: Art. 11a, Art. 6(1)(h), recital 37, dates |
| publications.europa.eu/resource/oj/JOC_2021_525_R_0001 | Commission guidance 2021/C 525/01: low-value subscriptions, §3.2.7, §5.6.1, express request, 10-day example, digital services |
| publications.europa.eu/resource/celex/62022CJ0565 | C-565/22 *Sofatutor*: paras 43, 48, 50, 51 |
| publications.europa.eu/resource/celex/62019CJ0641 | C-641/19 *PE Digital*: pro rata temporis; web services are not digital content |
| publications.europa.eu/resource/celex/62021CJ0249, …/62022CJ0400 | C-249/21 *Fuhrmann-2*: only the button's words count; C-400/22 *Conny*: duty applies to conditional payment (read, not used further) |
| publications.europa.eu/resource/celex/62011CJ0049 | C-49/11 *Content Services*: a hyperlink is not giving information; website not durable medium |
| publications.europa.eu/resource/celex/32019L0770 | Digital service definition |
| publications.europa.eu/resource/celex/32024R3228 | ODR Regulation repealed from 2025-07-20 |
| publications.europa.eu/resource/celex/32008R0593 | Rome I Art. 6 |
| publications.europa.eu/resource/celex/02016R0679-20160504 | GDPR Art. 13, 17(3) |
| https://www.zakonyprolidi.cz/cs/2026-159 | Act 159/2026 Sb.: §1830a, §1820(1)(i), §5e, §24 changes, effective date, no transitional rule |
| https://www.zakonyprolidi.cz/cs/2012-89 | OZ §435, §629, §1752, §1753, §1811–§1839, §1949, §2389a–§2389u |
| https://www.zakonyprolidi.cz/cs/1992-634 | ZOS §13, §14, §16, §19, §20d, §20e, §24 |
| https://www.zakonyprolidi.cz/cs/2013-363 | Model withdrawal instructions and form |
| https://www.zakonyprolidi.cz/cs/1992-586 | ZDP §7a, §7b |
| https://www.zakonyprolidi.cz/cs/2009-280 | Tax Code §97, §148 |
| https://www.zakonyprolidi.cz/cs/2004-235 | ZDPH §26, §28, §35, §100, §110f |
| https://www.zakonyprolidi.cz/cs/1991-563 | Accounting Act §1, §31: scope, retention |
| https://www.zakonyprolidi.cz/cs/2016-112 | EET Act repealed from 2023-01-01 |
| https://www.zakonyprolidi.cz/cs/2023-424 | Accessibility Act §2(3)(a): micro-enterprise exclusion |
| https://coi.gov.cz/informace-o-adr/, https://coi.gov.cz/mimosoudni-reseni-spotrebitelskych-sporu-adr/ | ČOI's ADR scope, filing, web address |
| https://www.gesetze-im-internet.de/bgb/__312k.html, https://www.gesetze-im-internet.de/bgb/__356a.html | German cancel button and withdrawal function |
| https://www.legifrance.gouv.fr/codes/id/LEGISCTA000046194160, https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034072591/, https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000046190107, https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000047614999 | French L215-1, L215-1-1, D215-1, through search extracts |
| https://www.epravo.cz/top/clanky/tlacitkovy-zakon-2026-novinky-pro-eshopy-a-online-podnikatele-121632.html | Secondary: subscriptions in scope, withdrawal only, fine, ČOI (2026-09-23) |
| https://www.ey.com/cs_cz/technical/tax/tax-alerts/2026/04/nove-tlacitko-odstoupit-pri-online-smlouvach | Secondary, written at the bill stage: fine, ČOI |
| https://www.freshfields.com/en/our-thinking/blogs/risk-and-compliance/pitfalls-for-e-commerce-how-the-new-eu-withdrawal-button-widerrufsbutton-wi-102ms91 | Secondary: login as a barrier (2026-05-11) |
| https://lawgent.se/the-digital-fairness-act-arrives-in-november-most-of-what-it-targets-is-already-unlawful/, https://www.freshfields.com/en/our-thinking/blogs/technology-quotient/digital-fitness-check-and-digital-fairness-act-part-7-contract-cancellations-and-102krzt, https://cms.law/en/gbr/legal-updates/inside-the-eu-s-planned-digital-fairness-act-digital-design-subscription-traps-and-influencer-marketing | Secondary: Digital Fairness Act timing and reported ideas |
| https://play.google/intl/en_ie/play-terms/embedded/eea/, https://play.google/intl/en_cz/play-terms/ | Play Terms for the EEA: Google Commerce Limited, withdrawal for services, price-change notice |
| https://play.google/intl/en_us/developer-distribution-agreement.html | DDA 3.4, 3.8, 4.7, 11.3 (effective 2025-09-15) |
| https://support.google.com/googleplay/answer/15576634, https://support.google.com/googleplay/answer/7659581, https://support.google.com/googleplay/answer/2479637 | Play refund rules in the EEA |
| https://support.google.com/googleplay/answer/6034670, https://support.google.com/googleplay/android-developer/answer/7645364 | Google Commerce Limited; merchant-of-record list |
| https://support.google.com/googleplay/android-developer/answer/10463498 | Service vs Digital Content |
| https://support.google.com/googleplay/android-developer/answer/17594752, https://support.google.com/googleplay/android-developer/answer/18100766 | Trader status: deadline, what is displayed |
| https://support.google.com/googleplay/android-developer/answer/9900533 | Subscriptions policy |
| https://support.google.com/googleplay/android-developer/answer/10787469, https://support.google.com/googleplay/android-developer/answer/13327111 | Data safety; account deletion and retention |
| https://docs.stripe.com/payments/checkout/custom-components.md?ui=full-page | Custom text, Terms checkbox, custom field types, `submit_type`, policies |
| https://docs.stripe.com/api/checkout/sessions/create.md?query=ui_mode | `ui_mode` values |
| https://docs.stripe.com/customer-management.md | Portal: cancel, invoices, tax IDs, Czech |
| https://docs.stripe.com/billing/subscriptions/cancel.md, https://docs.stripe.com/refunds.md | Cancelling, proration, refunds, fees not returned |
| https://docs.stripe.com/receipts.md, https://docs.stripe.com/invoicing/customize.md, https://docs.stripe.com/invoicing/send-email.md, https://docs.stripe.com/billing/revenue-recovery/customer-emails.md | Receipts, invoice fields, numbering, languages, e-mails, renewal reminders |
| https://docs.stripe.com/api/customers/delete.md | Deleting a customer |
| https://docs.stripe.com/get-started/checklist/website.md | Website checklist |
| https://stripe.com/en-cz/privacy, https://stripe.com/legal/dpa | Stripe's roles, data, transfers |
| https://stripe.com/resources/more/withdrawal-button-2026-germany | No product feature mentioned (updated 2026-04-30) |
| https://github.com/Albretsen/MCPEmails/pull/206, https://rechnungskit.de/en/guides/withdrawal-button | Secondary, weak: German Checkout button label |
| https://www.revenuecat.com/dpa/, https://www.revenuecat.com/docs/customers/customer-attributes | RevenueCat's role, transfers, attributes |
| https://www.revenuecat.com/docs/api-v1/customers, https://docs-origin.revenuecat.com/docs/manage-users | Deleting a customer, store subscriptions, re-creation (through search results) |

**Repo files read:**
- `docs/research/monetization.md`, `docs/research/play-billing-and-codes.md`, `docs/adr/0028-an-account-is-deleted-hard-with-no-archive.md`
- `_frontend/bikecheck/src/legal/{terms.en,privacy.en,delete-account.en}.json` read in full; `terms.cs.json` §8 checked
- `_backend/apps/monolith/prisma/schema.prisma`, `_backend/apps/monolith/src/ai-chat/ai-chat.service.ts:432`
- `_website_landing/index.html` (searched)

**GitHub issues read:** #344, #345, #346, #348, #349, #351.
