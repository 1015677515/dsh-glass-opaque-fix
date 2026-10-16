# Changelog

Notable changes to `dsh-glass-opaque-fix`. Format follows
[Keep a Changelog](https://keepachangelog.com/); versioning follows
[Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-10-16

### Added

- **Initial release.** Restores opaque backgrounds on floating panels that
  `dsh-plugin-wallpaper-engine` has made translucent, by injecting one stylesheet
  from a plugin the user owns.
- **One verified recipe**, for `dsh-cost-meter`'s 费用明细 (cost-details) dialog:
  `.cm-stat-dialog` plus its `-head` and `-body` children. Verified against
  cost-meter 1.8.32 and wallpaper-engine 1.3.3.
- **`RECIPES` as the single edit point.** Adapting the fix to another plugin means
  adding a selector to one array in `client.js`; nothing else changes. The README
  documents how to find a selector with DevTools and how to confirm the rule took.

### Notes on the design

- **Why a separate plugin rather than a patch.** The first version of this fix was a
  rule patched into the wallpaper bundle. It survived until wallpaper-engine
  1.3.2 → 1.3.3, which erased it. Both sides of the conflict are third-party and both
  update, so the only durable location is a third plugin owned by the user. This
  release is that plugin.
- **No global fallback.** Rules apply only to the selectors listed in `RECIPES`. A
  blanket `[role=dialog]` rule would also override the panels the glass theme is
  *supposed* to affect, turning off an effect the user asked for.
- **Fails closed.** A missing `document` or a context without `ctx.effect` results in
  no injection, never a throw: DSH's load path is all-or-nothing, and a cosmetic rule
  is not worth taking the client down for.
