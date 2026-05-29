## Problem

On the Insights page the MiniPlayer renders twice because:

- `src/pages/Insights.tsx` renders `<FloatingMiniPlayer />` (which wraps `MiniPlayer`)
- Immediately followed by `<BottomNav />`, which also renders `<MiniPlayer />` internally (see `src/components/BottomNav.tsx`)

Both end up visible right above the bottom nav bar.

## Fix

Remove `<FloatingMiniPlayer />` (and its import) from `src/pages/Insights.tsx`. `BottomNav` already provides the mini player, matching the pattern used by other pages that show `BottomNav`.

No other files change. No styling, layout, or data changes.