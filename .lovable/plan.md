## Change Theme input to an age-aware dropdown

Replace the free-text Theme field in `src/components/PersonalisedStoryForm.tsx` with a Select populated from an age→themes mapping, plus a "Custom" option that reveals a text input.

### Mapping
Add a new module `src/lib/themeOptions.ts` exporting:
- `THEMES_BY_AGE: Record<string, {label, value}[]>` — exactly the 2–10 lists from the request.
- `getThemeOptions(age: number)` — returns the list for ages 2–10, or an empty list for any age outside that range.

### Form behavior (`PersonalisedStoryForm.tsx`)
- Keep `form.theme` as the source of truth that gets submitted (no schema/API change).
- Add local UI state: `themeChoice` (the dropdown selection: a preset value, `""`, or `"__custom"`) and `customTheme` (text).
- Compute `options = getThemeOptions(Number(form.age))`.
  - If `options.length === 0` (age out of 2–10 range, or age empty): skip the dropdown and render only the custom text input (same as today's text field) — this matches the "Show only Custom" choice.
  - Otherwise render the `Select` with all options plus a final `{ label: "Custom (type your own)", value: "__custom" }`. When `__custom` is picked, show the text input beneath it.
- When the user picks a preset, set `form.theme` to that option's `value`. When they pick Custom, set `form.theme` to whatever they type.
- When `form.age` changes, reset `themeChoice`, `customTheme`, and `form.theme` to empty so a stale preset from a different age doesn't carry over.
- On load: leave the dropdown blank even if `last_theme` was prefilled — clear `form.theme` after the existing prefill effect (per "Leave blank" answer). `last_occasion` and other prefilled fields are untouched.
- Validation: keep existing required-theme check (`form.theme.trim()` non-empty). Error message stays the same; for the dropdown variant the error renders under the Select.
- Tooltip and `FieldLabel` copy unchanged.

### Out of scope
No DB migration, no changes to story generation payload, no changes to other form fields.
