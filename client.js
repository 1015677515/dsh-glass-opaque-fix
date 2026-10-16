/**
 * dsh-glass-opaque-fix — Client half.
 *
 * Restores opaque backgrounds on floating panels that a liquid-glass theme has made
 * translucent.
 *
 * ## The problem this solves
 *
 * `dsh-plugin-wallpaper-engine` implements its glass look by *rewriting the host's
 * own background aliases*. Under `body[data-we-glass-page]` it maps
 * `--dsw-alias-bg-layer-1/2/3` onto translucent films built from
 * `color-mix(…, transparent)`. That is deliberate — it is how the wallpaper shows
 * through — but it is a **global** change, so every other plugin that paints a panel
 * with those aliases silently becomes translucent too.
 *
 * Most such plugins expose no "make it opaque" switch, because they were written
 * against a host whose aliases were opaque. The result is a dialog you cannot read,
 * with no setting anywhere to fix it.
 *
 * ## Why the fix belongs here and not in either plugin
 *
 * Patching the wallpaper bundle works until wallpaper updates — then the rule is
 * gone (observed: 1.3.2 → 1.3.3 erased exactly such a patch). Patching the *other*
 * plugin's bundle works until *that* one updates. Both sides of the conflict are
 * third-party and both move.
 *
 * This file is owned by the user, updated by nobody, and only *adds* a rule rather
 * than editing anyone else's. It therefore outlives updates of both sides.
 *
 * ## Adapting it to another plugin
 *
 * The mechanism is the same three steps every time; only the selector changes. See
 * RECIPES below.
 */

window.__ModuleLoader__.load({
  id: 'dsh-glass-opaque-fix',
  factory() {
    /**
     * ───────────────────────────────────────────────────────────────────────────
     *  RECIPES — edit this list to fix another plugin. Nothing else needs changing.
     * ───────────────────────────────────────────────────────────────────────────
     *
     * An entry needs only `selectors`: the class the floating panel carries.
     *
     * Finding the selector for a plugin you have not seen before:
     *   1. Open the panel that looks translucent.
     *   2. DevTools → Elements → click the panel. Read its `class` attribute.
     *   3. Add `.that-class` below, preferring the outermost panel element.
     *   4. If the panel has a distinct header/body that also looks washed out, add
     *      those as `'.panel .panel-head'` — a background on a child paints over the
     *      parent's, so both may need the rule.
     *
     * `note` documents the recipe for a human or an AI reading this file; the code
     * ignores it. Keep it accurate — the point of this repo is that someone can copy
     * a working recipe.
     */
    const RECIPES = [
      {
        id: 'cost-meter',
        plugin: 'dsh-cost-meter',
        note: '费用明细 dialog (the cost-details popup). Verified against 1.8.32: the '
          + 'dialog carries .cm-stat-dialog and declares no background of its own, so '
          + 'what shows is the host default reading the glass-rewritten alias.',
        selectors: [
          '.cm-stat-dialog',
          '.cm-stat-dialog .cm-stat-dialog-head',
          '.cm-stat-dialog .cm-stat-dialog-body',
        ],
      },
      /*
       * Add further recipes the same way, for example:
       *
       * {
       *   id: 'some-plugin',
       *   plugin: 'dsh-some-plugin',
       *   note: '设置弹窗；选择器取自 DevTools，未逐个验证子元素。',
       *   selectors: ['.some-dialog'],
       * },
       */
    ];

    /**
     * The opaque colour to force.
     *
     * **Do not use `--dsw-alias-bg-layer-*` here.** That alias is precisely what the
     * glass theme rewrites into a translucent film, so painting with it reproduces
     * the bug instead of fixing it. This is the one mistake to avoid.
     *
     * `--we-panel-color` is preferred when the wallpaper is installed: it is defined
     * on top of the two static neutrals below, so the panel picks up the same tint as
     * the surrounding glass UI instead of looking like a mismatched flat rectangle.
     *
     * `--dsw-static-neutral-bluish-00` / `-875` are the fallback and the real
     * guarantee. They are *static* neutrals (light / dark), and the glass theme never
     * assigns them — checked against wallpaper-engine 1.3.3: zero assignments to
     * either. So they are opaque by construction, with or without the wallpaper.
     */
    const OPAQUE_BG =
      'var(--we-panel-color, var(--dsw-static-neutral-bluish-00, #ffffff))';

    /** Marks our sheet so a repeat injection cannot stack duplicates. */
    const PLUGIN_ID = 'dsh-glass-opaque-fix';

    /**
     * Build the stylesheet from RECIPES.
     *
     * `!important` is load-bearing, not decoration. The glass theme's token mapping
     * is scoped under `body[data-we-glass-page]`, which outranks a bare class
     * selector; winning that comparison is the entire purpose of this plugin.
     *
     * Every selector in a recipe gets the same declaration. Listing parent and child
     * together is intentional: a child's own background would otherwise paint over
     * the parent's, leaving a translucent strip where the child sits.
     */
    function buildCss() {
      const selectors = [];
      for (const recipe of RECIPES) {
        for (const selector of recipe.selectors) selectors.push(selector);
      }
      // No recipes configured: inject nothing. An empty <style> node would only give
      // a later debugging session something to puzzle over.
      if (selectors.length === 0) return '';

      return [
        "/* Opaque floating panels under a liquid-glass theme.",
        ' *',
        " * Injected by dsh-glass-opaque-fix. Kept in the user's own plugin rather",
        ' * than patched into the wallpaper or the affected plugin: a rule inside',
        " * either one is erased by that plugin's next update.",
        ' *',
        ' * To fix another plugin, add its selector to RECIPES in client.js. */',
        selectors.join(',\n') + ' {',
        '  background: ' + OPAQUE_BG + ' !important;',
        '}',
      ].join('\n');
    }

    /**
     * Append the sheet, or refresh it in place if already present.
     *
     * Keyed by our own data attribute, matching the convention cost-meter uses for
     * its sheet (`style[data-plugin-css=…]`) so every plugin-injected sheet can be
     * found with one selector while debugging.
     *
     * A second call must not stack a duplicate: an HMR reload runs `apply` again on a
     * document that still holds the first element.
     */
    function ensureStyle(doc, css) {
      const selector = 'style[data-plugin-css="' + PLUGIN_ID + '"]';
      const existing = doc.querySelector(selector);
      const style = existing ?? doc.createElement('style');
      style.dataset.plugin = PLUGIN_ID;
      style.dataset.pluginCss = PLUGIN_ID;
      if (style.textContent !== css) style.textContent = css;
      if (existing === null && doc.head !== null) doc.head.appendChild(style);
      return style;
    }

    function apply(ctx) {
      const css = buildCss();
      if (css === '') return;

      /*
       * `ctx.effect` ties the injection to this plugin's lifetime: the callback runs
       * on activate, and the function it returns runs on deactivate or reload. That
       * cleanup matters — a deleted plugin still styling the page is a worse failure
       * than the transparency being fixed.
       *
       * Guarded on `ctx.effect` existing because a client context is not guaranteed to
       * provide it, and DSH treats a throw during activation as fatal: without the
       * scope we degrade to "no rule injected" rather than a broken UI.
       */
      if (typeof ctx.effect !== 'function') return;

      ctx.effect(() => {
        try {
          const doc = globalThis.document;
          if (doc === null || doc === undefined || doc.head === null) return () => {};
          const style = ensureStyle(doc, css);
          return () => {
            if (style.parentNode !== null) style.remove();
          };
        } catch {
          // Leave the page unstyled rather than failing the load.
          return () => {};
        }
      });
    }

    /*
     * Exported the way every client bundle in this profile does it: the Loader reads
     * `apply` (and optionally `inject`) off the returned module object. Copied from
     * wallpaper-engine, which ends with `exports.apply = apply; return
     * module.exports;`.
     */
    const module = { exports: {} };
    module.exports.apply = apply;
    return module.exports;
  },
});
