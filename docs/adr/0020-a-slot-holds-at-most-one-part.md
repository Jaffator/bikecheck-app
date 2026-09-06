# A slot on the bike holds at most one part

A bike's build has no notion of a place. Nothing stops the same part being added twice, so a bike
can carry two chains, three forks, or a fourth brake caliper, each accumulating its own wear and
each answering "how far do I get on a chain?" with a different number.

A **Slot** is `(bike, component_type, position)`, and at most one active Mounted Component holds
one. Adding a part into a slot that is taken is refused; the way to free it is to Dismount what is
there, or to Replace it, which frees and refills the slot in the same move.

`position` is a value, not a wildcard. A Brake Caliper recorded with no side holds the slot
`(bike, Brake Caliper, null)` and leaves front and rear open — which is what keeps rows written
before this decision from blocking the parts an owner adds after it.

## Position becomes required going forward

A slot key needs a side, and the form made one optional: `has_position` types could be saved with
`position: null`. New parts in a category with `side_choice` must now name a side. Correcting an
existing part does not: forcing an owner to supply a side before they can fix a description is
work handed to them for a gap they did not make.

## Where it is enforced

Both ends. The form leads — a taken slot is shown greyed with the reason under the field — and
`createBikeComponent` refuses with a 409, so the invariant survives any caller.

Bike creation is out of scope. Its parts are written in one transaction before the bike has an id,
and the seed sends each type once, so the duplicate this guards against cannot arise there.

## Considered options

**Blocking on the component type alone** was simpler and wrong: `has_position` exists precisely
because Brake Caliper, Rim, Tire and Rotor sit on a bike twice, and a type-wide block would refuse
the rear one.

**Hiding a taken option** rather than disabling it was rejected for the reason ADR 0018 gives for
the disabled Delete: a vanished item teaches the owner that the catalogue lacks the part, while a
greyed one with a line saying why sends them to Dismount or Replace.

**Making Dismount a Service**, so that it and Replacement went through one entrance, was
considered and rejected. It is what raised this question — Replace and Dismount both end a Mounted
Component, and only one carries maintenance. The slot is the honest difference: Dismount leaves the
slot empty, Replace changes what fills it. Taking a part off is not work done, and ADR 0015 keeps
the components section out of maintenance.

## Consequences

- Dismount stops being a near-duplicate of Replace. It is the precondition for adding the same part
  again, which is a job Replace does not have.
- A bike whose essential part has been dismounted still shows nothing in its place. The section
  reads as if the part was never there. Left open — showing empty slots is a read-side change.
- The catalogue picker needs the bike's build to know what is taken, so the form reads both.
