# The components section does not touch maintenance

The bike detail's components section lists what is mounted and lets the owner add a part, correct
its description and dismount it. It deliberately cannot replace a part, record a service, or link
to the service wizard — the reasonable-looking button "Replace" is absent on purpose, and so is
"Log a service on this part".

Replacing is not an edit of a row. It ends one Mounted Component and begins another (ADR 0003), and
the wear the new part starts with is derived by rewinding ride data to the service date (ADR 0001).
A replacement performed here would either duplicate that arithmetic in a second place or skip it,
and either way it would produce a Mounted Component with no Service behind it — invisible in the
service history, absent from every Report, and untraceable to the day the work happened. Maintenance
has one entrance, the service wizard, reached from the bike detail's action tiles.

## Considered options

Offering a replacement directly on the row was the fastest path for the owner, and the wizard is
already capable of it: an action carries the mounted components it targets, and a Replacement sends
`old_component_mounted_id` with the new part's description. A softer version — a shortcut opening
the wizard prefilled with this bike and category — was also on the table and rejected: the action
tiles already reach the wizard from the same screen, and a second door to the same room buys
nothing but a second thing to keep working.

## Consequences

- An owner who spots a worn chain in this section reaches the wizard through the action tiles, not
  through the row. Two taps rather than one, in exchange for every replacement having a Service.
- The section's writes are narrow enough to stay honest: create, correct, dismount, delete. None of
  them read or write a Wear Baseline.
- Replacements made in the wizard surface here on their own — the old part joins the dismounted
  parts of its category, the new one takes its place in the build.
