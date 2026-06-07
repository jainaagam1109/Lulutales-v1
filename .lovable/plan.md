## Goal

Eliminate inconsistent page headers across the app by introducing a single `PageHeader` component and using it everywhere. Back button always top-left, profile avatar always top-right.

## 1. New component: `src/components/PageHeader.tsx`

Props:
- `showBack?: boolean` (default `true`)
- `backTo?: string` — if provided, navigate to that path on click; otherwise `nav(-1)`
- `showProfile?: boolean` (default `true`) — reuses existing `ProfileAvatarButton`
- `eyebrow?: ReactNode` — small label above title (e.g. "Hi Maya 👋")
- `title?: ReactNode`
- `subtitle?: ReactNode`
- `children?: ReactNode` — rendered below the title block (search bar, filter chips, etc.)

Structure (tokens reused verbatim from current pages):

```tsx
<header className="px-5 pt-4 pb-3">
  <div className="mb-3 flex items-center justify-between">
    {showBack ? (
      <button onClick={...} className="flex items-center gap-1 text-xs text-primary-deep">
        <ChevronLeft className="h-4 w-4" /> Back
      </button>
    ) : (
      <span aria-hidden className="h-4 w-4" />  /* spacer keeps avatar pinned right */
    )}
    {showProfile ? <ProfileAvatarButton /> : <span aria-hidden />}
  </div>

  {eyebrow && <div className="text-xs text-muted-foreground">{eyebrow}</div>}
  {title && <h1 className="text-2xl font-extrabold text-foreground">{title}</h1>}
  {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
  {children}
</header>
```

No new colors, fonts, or spacing — only existing tokens (`px-5 pt-4 pb-3`, `text-primary-deep`, `text-foreground`, `text-muted-foreground`, `text-2xl font-extrabold`).

## 2. Refactor pages

### Sub-pages (showBack=true, avatar top-right)
- **Insights** — currently has avatar on LEFT and Back on RIGHT (the worst offender). Swap to standard.
- **MagicHub** — currently has Back only; now also gets the avatar via PageHeader. Remove the unused `ProfileAvatarButton` import that exists today but isn't rendered.
- **Player** — replace its inline back chevron with PageHeader (showProfile may stay true; matches convention).
- **StoryDetail** — currently has Back only; use PageHeader with `backTo` derived from `location.state.from` (preserves existing `/happy-place` vs `/` logic).
- **BedtimePreview** — same as StoryDetail (preserve `backTo` logic).
- **Profile** — uses PageHeader with Back left, no avatar (the page itself IS the profile — pass `showProfile={false}`).
- **AdminUpload** — Back left, avatar right.

### Top-level pages (showBack=false, avatar top-right)
- **Home** — move "Hi {name} 👋" into `eyebrow`, "Story time" into `title`, and the search input + theme chips into `children`.
- **Library** — title "Library", subtitle "Your saved stories".
- **Dashboard** — greeting into eyebrow/title, rest into children as needed.
- **HappyPlace** — same pattern.

### Untouched
- **BedtimeReader** — intentional full-screen reader with floating circular back, no PhoneShell. Leave as is.
- All other pages not listed (Auth, Onboarding, SelectProfile, Generating, NotFound, Admin, AdminHealth, ResetPassword, AudioStoryForm, BedtimeStoryForm, Index) — out of scope for this change.

## 3. Cleanup

- Remove the now-dead `ProfileAvatarButton` import from MagicHub (it's imported but never rendered today).
- Remove `ChevronLeft` imports from refactored pages where they were only used for the page-level Back button.

## Out of scope

- No color, font, spacing, or token changes.
- No business logic changes; `backTo` semantics in StoryDetail/BedtimePreview are preserved exactly.
- No changes to `ProfileAvatarButton` itself.
