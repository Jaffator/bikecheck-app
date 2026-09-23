# A job is not put off, the interval is raised

ADR 0032 built the drawer around three controls, and ADR 0033 wrote down what two of them meant.
Putting a job off — the Extension — is removed here, and the announcements it used to quiet now
carry on past due.

## What was wrong with putting a job off

An Extension lengthened the Service Interval the percentage was measured against. A chain put off
twice read 100% while it had actually gone 120% of the way, and the reading is the one number the
owner is asked to trust. ADR 0033 already saw it coming: *"Repeated taps grow the interval without
saying so; the honest control for that is the interval row."* The pill saying "Extended" named that
something had happened, never how far it had moved the number.

It was also invisible in the wrong direction. An Extension expired at the next Service, so an owner
who kept tapping it re-learned nothing: the same disagreement with the same plan had to be
re-entered every cycle, and the plan itself was never corrected.

**What an owner who disagrees does now is raise the interval**, with a minus and a plus either side
of the number, stepping by a tenth of the bike's plan — the same slice one tap used to add. It says
so on the row ("20 % longer than the default"), it survives the Service, and it is carried onto the
next part by ADR 0033's copy. The control that used to lie now teaches the app something.

The step is taken from `default_interval` and never from the value on screen. A step off the
current value does not come back: +10% then −10% of 4 400 lands on 3 960, and a control whose minus
does not undo its plus is a control nobody trusts twice.

## Being overdue is not one thing the app says once

`reached_threshold` used to stop at 100. The bike went on wearing and the app went quiet, which is
what made a silent Extension so easy to live with. It now moves every ten percent above due —
110, 120, 240 — and each move up announces, uncapped.

The announcing bands below it moved in the same pass: 75 and 90 rather than 70 and 95, and the
Attention Level gained a fifth step so that the word on a row and the colour behind it stop
disagreeing. That change is written down in ADR 0026's 2026-09-22 revision, because it is about
what a reading *means* rather than about putting a job off.

The band therefore stops agreeing with the Attention Level, which ADR 0026 had kept in step. 110%
and 240% are both `overdue` and wear the same colour, but they are different bands. The colour ran
out of room at overdue; the reading did not. Two consequences fall out of that:

- The counts in a notification are taken by **level**, not by band. Counting bands would report a
  chain at 132% as standing in no band that is being counted, so the push would say a bike needs a
  service and then size the job at nothing.
- The body names the **worst** Tracked Action that crossed, with its percentage. Past 100 the
  headline and the counts stop moving, so the percentage is the only part of the push that says
  anything new — without it, every ping past due is the same notification arriving again.

One notification per bike per evaluation still holds, so the real ceiling is one push per ride per
bike. The escape is the mute already on the row, or the interval control above it.

## Considered options

**Keeping the Extension and showing it honestly** — a second number beside the percentage — was
rejected as two readings where the owner was promised one.

**A separate switch for announcements past 100** was rejected: the drawer is a reading, not a
settings panel, and the honest answer to "this is too often" is a longer interval, which is the
control one row up.

**Capping the bands** — quiet again at 200%, say — was rejected for the same reason as the
Extension. Going silent about a part still on the bike is the app deciding the owner stopped caring.

## Consequences

- `tracked_action_state` loses `extended_by_km`, `extended_by_min`, `extended_by_healthIndex`,
  `extended_km_at` and `extended_min_at`, and `liveExtension` — the rule weighing an Extension
  against the Service that ended its cycle — goes with them. A reading in flight when this shipped
  jumps up by whatever had been added to it.
- `POST /service-tracking/postpone` is gone. `interval` on the response is now the interval in
  force and nothing else, so the client can read the base off it.
- The inline Postpone control leaves the row, and with it the last write a row held. The row is a
  reading again — though it still cannot be a plain `<button>`, because the info button explaining
  the measure is nested inside it.
- The interval editor no longer expands. One tap of `+` replaces one tap of Postpone, so making it
  three taps would have made the replacement slower than the thing it replaced. The write is
  debounced instead, because it re-evaluates the whole bike and may announce.
- ADR 0032's third control and ADR 0033's Extension consequences are superseded by this. What those
  say about the Interval Override, about muting, and about the Replacement copy still stands.
