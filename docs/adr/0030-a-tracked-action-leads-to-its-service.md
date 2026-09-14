# A Tracked Action leads to its Service

A Tracked Action row — on the bike's own page and on the dashboard's Needs Attention card alike —
opens the service wizard on the actions step with that very job ticked on that very part, and
its row already unfolded to the price and the note:
`/service/new?bike=3&category=2&action=17&component=42`. The reading is a job waiting to be done,
so the row leads to doing it, and lands on the fields that record it.

The dashboard row used to open the bike's detail, where the same row sat in the Service Tracking
card and led nowhere. Recording the chain the dashboard had just called overdue meant walking to
the bike, then to the Add Service tile, then picking Drivetrain and finding the chain among the
candidates — re-entering, step by step, what the row already knew.

## The URL is ADR 0017's, and a Tracked Action fills every field of it

ADR 0017 set the link for a Replacement carried in from a part: bike, category, action, component.
A Tracked Action is a part paired with an action (ADR 0027), so it carries three of the four
already. The fourth, the part's Component Category, was not in the reading; it is now served as
`component_group_id` on every Tracked Action, so a row can be turned into the link with nothing
else read. One helper, `trackedActionServiceLink`, does that turning for both cards.

No second shortcut was built. A one-tap "mark as done" — a service written with today's date and
no price, from a confirmation sheet — would have been faster and was rejected: it opens a second
door into writing a Service, next to the wizard that owns every rule about what one carries. The
wizard is opened where the work already is; what it takes from there is the user's to fill in.

## The wizard fetches its own seed

ADR 0017 seeded the draft synchronously out of the query cache, on the assumption that whoever
built the link had just read the catalogue to build it. A Tracked Action reads no catalogue, so
the cache is cold from either card, and the seed would fall through to the category step — which
is the whole shortcut lost.

The wizard now reads the catalogue the link names through the same query the actions step reads,
so the two share one request, and derives the seed from it as it arrives rather than setting it.
Until it arrives the wizard shows a loader under the Actions title, not the category step it
would otherwise read as: a step the user can tap into is not something to flash past. The seed is
spent — never rebuilt from the URL — the moment the block is committed or left with back, so an
emptied block stays empty. A fetch that fails, or an action the catalogue no longer carries, lands
on the category step with the bike chosen, exactly as a cold link did before.

## Back leaves the way the link came in

The wizard's rule is that back walks the wizard and only leaves it from the step the user
entered on (ADR 0006). A link enters on the actions step, so back from there — with nothing saved
yet — leaves for the page the row was tapped on, not for a category step the user never saw.
Once a block is committed the Summary is the hub as before, and back behaves as it always has.

Leaving asks only when it would lose something. The seed is what the user opened, so an untouched
one costs nothing to leave and is left without a question; a price typed in, a tag taken, a
second job ticked or the seeded one unticked is work, and is asked about as any other block's is.

## Consequences

- Every row leads, the quiet ones included: a part is replaced early as often as it is replaced
  late, and a reading at 34% is still the fastest way to record that job.
- The dashboard card no longer reaches the bike's page. The bike is named on each row and reached
  from the Bikes tab; the card answers "what needs doing", and now also "do it".
- Saving returns to the bike's detail whichever card the wizard was opened from — the `?bike=`
  rule of ADR 0017 is unchanged, so an owner arriving from the dashboard lands on the bike whose
  reading just reset rather than back on the dashboard.
- A link opened cold — a reload, a notification, a pasted URL — now seeds too. That was a
  consequence of ADR 0017 that no longer holds; it is amended there.
- The Postpone control on an overdue row stays outside the tap that leads to the wizard, as it
  was outside the tap that led to the bike.
- The components section still builds its own Replace link by hand; the helper is the tracking
  domain's, and sharing it was left for when a third caller appears.
