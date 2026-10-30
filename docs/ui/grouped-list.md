# Grouped list

A titled card of rows divided by hairlines — the add-service mocks F and G, and Edit bike
after mock L. An eyebrow above, the standard card surface (`docs/ui/card-surface.md`), and
rows that carry their own height, so the card has no vertical padding of its own.

```tsx
import { GroupedList } from "@/components/GroupedList";
import { NoteRow } from "@/components/NoteRow";
import { PriceRow } from "@/components/PriceRow";

<GroupedList title={t("addService.sectionDetails")}>
  <PriceRow label={t("addService.totalCost")} value={total} onChange={changeTotal} />
  <NoteRow label={t("addService.note")} emptyLabel={t("addService.addNote")} value={note} onChange={setNote} />
</GroupedList>
```

- `title` is the eyebrow. Left out where the page names the card itself.
- `hero` runs edge to edge above the rows — the bike's photo on Edit bike. Only then does the
  card clip, so a card without one never clips a row.
- The hairline is drawn by a wrapper round each row after the first, so a row never needs to
  know whether it is first.

## ListRow

The one row everything is built on: the label left at `fz={14}` `text.6`, whatever it holds
right-aligned beside it.

| prop       | what it does                                                         |
| ---------- | -------------------------------------------------------------------- |
| —          | 50px tall (`LIST_ROW_HEIGHT`), one tap target whatever the row holds |
| `compact`  | 44px (`LIST_SUB_ROW_HEIGHT`), a row inside an expanded one           |
| `onClick`  | the whole row becomes one button, with a chevron                     |
| `labelFor` | ties the label to the row's field, so a tap on the label focuses it  |
| `disabled` | dims the row as a whole                                              |

A field typed straight into a row takes `listRowInputStyles`, or `listRowFigureInputStyles`
for a figure, from `groupedListStyles.ts`: no box of its own, right-aligned, as tall as the row.

## The rows

One file each in `components/`, beside `GroupedList`:

| row         | holds                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------- |
| `TextRow`   | a text field; `numeric` and `suffix` for a figure and its unit, `invalid` reddens the placeholder |
| `NumberRow` | a number field; an emptied one is `null`, never `0`                                         |
| `PriceRow`  | a price, the user's currency symbol beside it                                               |
| `NoteRow`   | the note's first line, and a sheet to write the whole of it; `emptyLabel` words the empty row |

## Rules

- A unit or a currency sits beside the field, never inside it, so an emptied field stays empty.
- A row that hangs off another — a picked file, "Add another action" — is
  `LIST_SUB_ROW_HEIGHT`, never a literal.
- `NoteRow`'s empty text is the caller's: "Add a note" on a Service, "Add notes" on a bike.

## Where it lives

- **Add service, Summary** — `ServiceSummaryStep.tsx`. Actions, then Details.
- **Add service, action picker** — `ServiceActionsStep.tsx`. Service and Replacement; an
  expanded action holds its Note and Price as `compact` rows.
- **Add bike** — `BikeSpecification.tsx`. The photo card, then Setup.
- **Edit bike** — `BikeEdit.tsx`. `BikeSpecification` with brand, model and year above the
  name, then Details.
