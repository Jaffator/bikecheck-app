# A Report is frozen when it is made, and closed until the owner publishes it

A Report is built by copying what it covers into a snapshot stored with the Report itself, rather
than by reading the Services live whenever the link is opened. Someone sent a Report of a bike's
history is looking at a document, and a document that quietly rewrites itself when the owner edits
a note — or empties when they delete a Service — is worth nothing to the person holding it.

Making a Report and publishing it are two acts. `Export` creates the Report and shows it back to
the owner; only a second tap opens its Share Link to the world. A Report therefore has three states,
which is why `is_public` sits alongside `revoked` rather than one flag carrying both meanings:
not yet published, published, and revoked. Discarding a Report that was never published deletes
the row — there is nothing to take back.

## Consequences

- Every `Export` makes a new Report with a new Share Link. Nothing is recycled, so revoking a link
  sent to one person leaves the link sent to another alive.
- Links do not expire on their own. For a doc handed to the buyer of a bike, "the link died" is a
  worse failure than "the link is still up", and revoking is always at hand.
- The choice of whether a Period Report carries the bike's components is frozen with everything
  else. A link's contents cannot change under the person reading it.
- A Report outlives what it describes: `bike_id` is deliberately not a relation, so deleting the
  bike does not take the doc with it.
- The Report's language is frozen too — the owner's, not the reader's. Notes, tags and component
  descriptions are the owner's words and cannot be translated; framing them in a language the
  content does not speak would only make the doc read as a broken translation.
