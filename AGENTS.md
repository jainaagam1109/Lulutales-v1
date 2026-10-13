# Project conventions

- Keep brand colours, typography and legacy visual treatments in global semantic tokens and shared styles so visual redesigns do not alter page behaviour.
- Reuse LuluLogo for brand signatures and its supplied mark for the favicon so the brand stays consistent across screens.
- Anonymous visitor inserts use an auth-independent client and capture direct auth visits before React renders, so preview auth-storage failures cannot suppress funnel events.