# Quirky journal entry cards (radius only)

Keep the existing entry cards exactly as they are — same mood-tinted background, mood face, special icons, gratitude text, and note. The only change is giving each card a **soft, slightly asymmetric border-radius** so they feel quirky and organic, in the same family as the date blob, without going so far that they look like blobs.

Based on your "level 2" choice, the effect stays subtle: corners stay close to the current `1rem`, just gently uneven.

## What changes

In `src/routes/_authenticated/index.tsx`, the `EntryCard` component:

- Replace the fixed `rounded-lg` with an inline asymmetric radius applied via `style`, e.g. roughly:
  ```
  borderRadius: "1.4rem 0.85rem 1.4rem 0.85rem"
  ```
  This keeps it soft and tappable but slightly off-balance, so it reads as quirky rather than a plain rounded rectangle.

- To avoid every card looking identical, vary the radius gently per card. A small deterministic helper picks one of ~3 subtle radius presets based on the entry id (so a given entry always renders the same shape, no random reshuffle on re-render). All presets stay within the subtle range (corners between ~0.85rem and ~1.5rem).

- The press interaction (`active:scale-[0.99]`) stays unchanged.

## What stays the same

- Colors, mood palette, fonts, spacing, icons, text.
- The date blob, bottom nav, search, month nav, history page — untouched.
- Card padding and content layout.

## Technical notes

- Pure presentation change in one file (`EntryCard`). No data, schema, or business-logic changes.
- Radius applied through the existing `style` prop (the card already uses `style` for its background color), merged with the mood background.
