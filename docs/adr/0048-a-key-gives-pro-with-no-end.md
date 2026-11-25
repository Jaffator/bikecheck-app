# A Key gives Pro with no end

A Key gave a second Bike only, and early users should have the whole of Pro. **A Key gives Pro, the same
Pro as a paid one, for free and with no end.** The account records when Pro started (`users.pro_since`);
an account with Pro has no bike limit. Changing, switching off or deleting a Key never takes Pro back,
and no Bike of an account with Pro from a Key is ever locked.

The moment is kept on the account and not derived from its link to the Key: deleting a Key clears that
link. The link stays only to count the Key's uses. The account's own `bike_limit` stays too, for exceptions
made by hand without giving Pro.

## Considered options

- **A fixed period**, such as a year: what #355 and the Terms research (#351) leaned to. It needs an end,
  a warning before it, and locked Bikes (#346) after it, none of which exist yet.
- **An end stored now and enforced later**: an early user would read "for free" today and lose Bikes to
  a date nobody showed them.
- **A higher limit on the Key**, as it was: not Pro, so the AI benefit and paid Pro would need a second rule.

## Consequences

- Given away for good: ending Pro from a Key later means taking it from people. The Key's cap on accounts
  is what bounds it.
- The Terms (#351) have to describe the grant as free and without an end.
- No entitlements table yet. It comes with selling (#356), and these accounts move into it then.
