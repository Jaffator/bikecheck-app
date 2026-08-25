# The Summary's total and Save are pinned to the bottom, and the total is edited there

The Summary is where a Service is assembled (ADR 0006), and it grows: a block per category, a
date, a note, attachments. The two things the user is actually steering by were the two that
scrolled away first — what the visit cost, and the button that records it. Adding a fourth
category meant scrolling to the bottom to see whether the total still looked right, and scrolling
back down again to save.

Both now live in a bar pinned above the bottom of the screen for the whole step. The total is not
duplicated there: the field was removed from the scroll flow, and the bar is the only place the
number is shown and the only place it is typed. It stays what it was — the sum of the per-action
prices until the user types over it, an override that covers labour and discounts after that.

## Consequences

- The bar is the Summary's own, not the wizard's. The other three steps end in their own actions
  and are untouched.
- A total the user has typed no longer follows the sum, and now they watch that happen: adding a
  category afterwards leaves the total where they put it. Clearing the field hands the sum back,
  applied when the field loses focus rather than on each keystroke, so retyping a number never
  flashes the old sum in between.
- A save failure is reported inside the bar, beside the button that failed, rather than in a line
  of page the bar may be covering.
- The Android webview does not shrink for the software keyboard, so a bar fixed to the bottom
  would be typed into blind. `useKeyboardOffset` lifts it by the height the visual viewport
  reports as covered. This is the opposite job to `useScrollIntoViewOnFocus`, which moves a field
  in the scroll flow above a fixed footer.
- The Summary reserves room at its bottom for the bar to float over. The fade beneath the bar
  is the one the tab bar already uses, so page content dissolves under it rather than being cut.
- The actions step carries the same bar, holding what the category costs so far. That figure is
  a tally, not an input: it is the sum of what the user typed into the actions above it, and the
  override belongs to the visit's total alone. A per-category override would be a second number
  covering the same money, with no rule for pushing it back down into the actions it came from.
