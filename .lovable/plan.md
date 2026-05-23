## Root cause
The previous story details are reloaded from `child_profiles`, but the story form is not reliably persisting all entered fields back to that table after submit.

Two likely issues in the current flow:
1. **Profile save is fire-and-forget** in `src/components/PersonalisedStoryForm.tsx` (`void supabase.from(...).update(...)`), so failures are silent and the app navigates away immediately.
2. **Not all fields are being saved** — notably `family_type` is used for prefill, but it is not included in the profile update payload after story creation.

## Plan
1. **Make profile persistence explicit in `src/components/PersonalisedStoryForm.tsx`**
   - Await the `child_profiles` update instead of firing it in the background.
   - Keep the existing story creation flow intact.
   - If the profile update fails, surface a toast instead of failing silently.

2. **Save the same fields that are later used for prefill**
   - Include `family_type` in the update payload.
   - Verify the payload matches the fields loaded on mount (`family_type`, `city`, `personality`, `home_type`, `family_members`, `family_address_terms`, `sibling_age`, `last_theme`, `last_occasion`, and identity fields when chosen).

3. **Preserve current UX and styling**
   - No visual/layout/color changes.
   - No dependency changes.
   - Only adjust the persistence logic in the existing form.

## Files to change
- `src/components/PersonalisedStoryForm.tsx`

## Expected result
After creating a story, reopening the form should prefill the most recently entered details from the previous story creation instead of showing blanks or older values.