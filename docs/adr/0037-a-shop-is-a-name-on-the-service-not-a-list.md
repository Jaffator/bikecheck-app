# A shop is a name on the Service, not a list

A Service now records its Place: Home, or a Shop with an optional name (PRD #178). The owner
wants to see which shop did the work, and wants to type that shop once. The obvious model is a shops
table the Service points at. We reject it: **a shop is a name typed on the Service**, and the only
thing that knows every shop is the owner's own past Services.

## How the name is typed

The Summary offers `Home | Shop` next to the date, Home pre-selected. Picking Shop shows a name
field that suggests the names the owner typed before, newest use first, each shop once whatever
its capitals, from every bike they own, archived ones included, and never from a deleted Service.
The name is trimmed, and a blank name is a Shop with no name. A name only exists on a Shop.

## What follows from it

- **Renaming a shop rewrites nothing.** Each Service keeps the name it was saved with. A
  misspelled name stays on its Service and keeps being suggested until newer names outrank it
  among the twenty offered.
- **Existing Services are not backfilled.** A Service recorded before the Place existed has none,
  and every reading of it shows nothing rather than guessing Home. The shop names people wrote
  into notes until now stay in the notes.
- **The Place is part of the occasion**, like the Service Date (ADR 0002): one per Service, not
  per Category Block. Changing it rewrites no Wear Baseline; only a moved date does (ADR 0001).
- A Report copies the Place at Export like everything else (ADR 0011). Reports made before it
  carry none, and are not rewritten.

## Considered options

**A shops table** the owner manages — rename, merge, address, contact — was rejected for now. It
is a second thing to keep, for an owner who uses one or two shops, and nothing today reads a shop
beyond its name. It stays open: the names on the Services are what such a table would be seeded
from.
