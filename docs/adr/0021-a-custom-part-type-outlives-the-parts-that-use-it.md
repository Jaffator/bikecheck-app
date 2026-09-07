# A custom part type outlives the parts that use it

Naming a kind of part the catalogue does not carry writes a Component Type, and deleting the part
that prompted it leaves that type behind. The picker goes on offering a name the owner recorded
once and no longer wants, with no way to take it back.

Deleting a Mounted Component is right to leave the type alone. A Component Type is a catalogue
entry, not a physical object, and the two deletes answer different questions: one says this part is
not on this bike, the other says stop offering me this kind of part. The second has had no
entrance, which is the whole of this decision — a custom type leaves the catalogue from Settings,
and from nowhere else.

## Removing a type never disturbs the parts wearing its name

A type the owner removes may still name parts on their bikes, parts they have dismounted, and the
Services recorded against both. Those parts keep their name, their wear and their history, and stay
serviceable: the Service wizard reaches a type through the parts mounted on the bike rather than
through the catalogue, so a removed type is still offered work and still offered Replace. Removal
is a statement about what the owner will be offered next time, never a claim that the fork was
never on the bike.

## Deleted is deleted

Where nothing references the type, the row is deleted outright — the catch-all Replacement target
written with it goes by the foreign key's own cascade — and the name is free again the moment it is
gone. Where parts reference it, the row is kept and marked deleted, because those parts need it to
keep resolving. What decides between the two is every row holding the type by its foreign key, a
part the owner has already deleted included: such a part is invisible to them, and reads as unused
in the list, but the database still needs the type it points at.

A soft-deleted row is not the type coming back. Typing the same name again creates a new type with
a new id; it does not revive what was removed, and the parts that kept the old name keep pointing
at the old row. This is what the owner means by deleting something: the catalogue key is one live
row per name, not one row per name ever used.

## Considered options

**Deleting the type with the last part using it** was the first answer and the wrong one. It reads
the type as a side effect of the part, which the glossary already denies, and it would take the
name off a bike the owner never touched.

**Reviving the soft-deleted row** when the name is typed again was rejected. It keeps the data
tidier — one row per name, and the parts still carrying it are reunited with a live type — but it
makes a delete provisional in a way the owner did not ask for, and the resurrected type comes back
carrying uses they thought they had removed.

**Refusing to delete a type while parts use it** was rejected as a chore handed to the owner. It
cannot even be satisfied for a part a Service has hardened, which ADR 0016 forbids deleting at all.

**A delete on the row in the add-part picker**, rather than a screen in Settings, was rejected for
the reason ADR 0018 gives for keeping destructive actions off a crowded surface: the picker is
where a part is chosen, often one-handed, and a catalogue entry should not be removable by a
mistimed thumb.

**Marking every removal soft** was rejected as tidier code paying in tombstones: the ordinary case
is a name typed wrongly and used by nothing, where there is nothing to keep.

## Consequences

- `component_types` gains `is_deleted` and `deleted_at`, and its `(component_type, user_id)`
  uniqueness becomes one live row per name — a partial index Prisma cannot express in the schema,
  so it is written by hand in the migration.
- The catalogue read excludes removed types; the parts read does not, because a part must render
  its name whatever became of the entry.
- Settings carries the list, in a drawer rather than a page of its own, and each row shows how many
  parts still use the type — the only place that fact is visible before the removal happens.
- The owner can end up with two types of one name in the data, one removed and one live. It is the
  price of a delete that means what it says.
