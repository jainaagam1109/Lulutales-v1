## Problem
Failed stories with titles like "error — groq failed" and incomplete `bedtime_text` stories with null `story_text` are still visible in the "My Happy Place" screen.

## Solution

### 1. Database cleanup — delete failed stories permanently
Delete 10 failed stories from the `stories` table:
- 1 `personalised_audio` story titled "error — groq failed"
- 9 `bedtime_text` stories: 5 with "error" in title, 4 with null `story_text` (including 2 titled "Story" and 2 with custom titles but no content)

### 2. UI filter update in `src/pages/HappyPlace.tsx`
Tighten the `personalised` and `bedtime` `useMemo` filters to exclude:
- Stories whose title contains "error" or "failed" (case-insensitive)
- `bedtime_text` stories with null/empty `story_text`

### Files to change
- `src/pages/HappyPlace.tsx` — update filters
- Database — DELETE queries for failed stories