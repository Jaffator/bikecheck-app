# The service detail is a layer over its list, not a page of its own

A recorded Service used to open at `/service/:id`, a sub-page like the bike detail. Returning from
it remounted whichever list it was opened from — the header keys page content by pathname — so the
full history came back scrolled to the top with every page of infinite scroll thrown away. A user
reading down a year of work lost their place every time they looked at one of them.

The detail is now a bottom sheet over the list, and which service is open rides in the query string:
`/service?service=42`, `/service/history?bike=3&service=42`. The path does not change, so the list
underneath is never remounted and keeps its scroll and its loaded pages. `ServiceList` owns the
parameter and the sheet, so the landing page and the full history cannot drift apart.

The alternative was keeping `/service/:id` and rendering it over the list through react-router's
background-location trick. It buys a prettier URL at the cost of a routing pattern this app uses
nowhere else, for a screen no deep link points at.

## Consequences

- The detail stays addressable. `?service=42` is a link like any other, so nothing that could have
  pointed at `/service/:id` has lost its target — no notification route ever did.
- Android's hardware back closes the sheet for free: opening pushes a history entry, and the shared
  back handler pops it. Closing by the cross or the overlay pops that same entry rather than pushing
  a second one, so back never lands on the list twice over.
- The sheet opens with the tapped card's heading already filled in — bike, date, action count,
  total — and waits only for what the card could not know. Reached by link instead of by tap there
  is nothing to seed it with, and the whole sheet begins as a skeleton.
- Deleting closes the sheet and leaves the user in the list they were reading; the list refreshes
  itself. The old page had to navigate away to `/service`, which threw the history away again.
- `/bikes/:id` stays a route. The bike detail is a destination people arrive at from notifications
  and from the garage, not a glance taken from a list.
